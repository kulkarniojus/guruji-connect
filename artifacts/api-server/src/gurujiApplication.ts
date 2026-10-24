import type { Request, Response } from 'express';
import { pool } from './db';
import { DBStorage } from './dbStorage';
import { ageFromDateOfBirth, staffRegistrationPayload } from './registrationValidation';

export async function submitGurujiApplication(req: Request, res: Response) {
  if (!['customer', 'guruji'].includes(req.session.userRole || '')) {
    return res.status(403).json({message: 'Use the staff registration page to register someone else'});
  }
  const storage = new DBStorage();
  const user = await storage.getUser(req.session.userId!);
  if (!user) return res.status(401).json({message: 'Please log in'});
  const parsed = staffRegistrationPayload.omit({password: true}).safeParse({
    ...user, ...req.body,
    email: req.body.email?.trim() || user.email,
    gender: req.body.gender || user.gender,
    aadhar: req.body.aadharNumber ?? req.body.aadhar ?? user.aadhar ?? '',
    photoUrl: req.body.profilePicture ?? req.body.photoUrl ?? user.photoUrl ?? '',
    cities: req.body.cities || req.body.serviceAreas,
  });
  if (!parsed.success) return res.status(400).json({message: parsed.error.issues[0].message});
  const calculatedAge = ageFromDateOfBirth(parsed.data.dob);
  if (calculatedAge === null || calculatedAge < 18) {
    return res.status(400).json({message: 'Registration requires a valid date of birth and age of at least 18'});
  }
  const data = {...parsed.data, age: calculatedAge};
  if (!data.cities?.length || !data.pujas?.length || !data.languages?.length) {
    return res.status(400).json({message: 'Select service cities, pujas and languages'});
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`, [user.id]);
    const existing = await client.query(`SELECT id,status FROM guruji_profiles WHERE "userId"=$1`, [user.id]);
    if (existing.rows[0] && existing.rows[0].status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(409).json({message: 'Your Guruji profile is already approved. Edit it from My Profile.'});
    }
    const activeCities = await client.query(`SELECT id,name FROM cities WHERE "isActive"=true`);
    const selectedCities = data.cities.map(choice => activeCities.rows.find(c =>
      String(c.id) === String(choice) || c.name.toLowerCase() === String(choice).trim().toLowerCase()));
    const pujaIds = Array.from(new Set(data.pujas.map(Number)));
    if (selectedCities.some(c => !c) || pujaIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
      await client.query('ROLLBACK');
      return res.status(400).json({message: 'Choose active service cities and valid pujas'});
    }
    const pujas = await client.query(`SELECT id,name FROM pujas WHERE id=ANY($1::int[]) AND "isActive"=true`, [pujaIds]);
    if (pujas.rowCount !== pujaIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({message: 'A selected puja is no longer available'});
    }
    await client.query(
      `UPDATE users SET "firstName"=$1,"lastName"=$2,email=$3,mobile=$4,age=$5,gender=$6,
       dob=$7,aadhar=$8,caste=$9,address=$10,city=$11,state=$12,pincode=$13,photo_url=$14,
       role='guruji',"updatedAt"=NOW() WHERE id=$15`,
      [data.firstName,data.lastName,data.email,data.mobile,data.age,data.gender,data.dob || null,
        data.aadhar || null,data.caste || null,data.address || null,data.city || null,data.state || null,
        data.pincode || null,data.photoUrl || null,user.id],
    );
    const cities = selectedCities.map(c => c.name);
    const profileData = {
      userId: user.id, bio: String(data.bio || ''), experience: data.experience || 0,
      pricePerHour: data.pricePerHour ?? 500, specialization: pujas.rows.map(p => p.name).join(','),
      city: data.city || cities[0], cities, address: data.address, state: data.state, pincode: data.pincode,
      languages: data.languages, certificates: data.certificates || [],
      profilePictureUrl: data.photoUrl || null, religion: data.religion, age: data.age,
      isOnline: data.isOnline ?? false, isOffline: data.isOffline ?? true,
      isConsultation: data.isConsultation ?? false,
      videoUrl: data.videoUrl || null, status: 'pending', isAvailable: false,
      isVerified: false, aadharVerified: false, documentsVerified: false,
    };
    let profile;
    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      await client.query(
        `UPDATE guruji_profiles SET description=$1,experience=$2,"pricePerHour"=$3,
          specialities=$4,city=$5,cities=$6,address=$7,state=$8,pincode=$9,languages=$10,
          certificates=$11,profile_picture_url=$12,religion=$13,age=$14,video_url=$15,
          status='pending',"isAvailable"=false,"isVerified"=false,
          aadhar_verified=false,documents_verified=false,"updatedAt"=NOW() WHERE id=$16`,
        [profileData.bio,profileData.experience,profileData.pricePerHour,pujas.rows.map(p => p.name),
          profileData.city,cities,data.address || null,data.state || null,data.pincode || null,data.languages,
          profileData.certificates,profileData.profilePictureUrl,data.religion || null,data.age,
          profileData.videoUrl,id],
      );
      await client.query(`DELETE FROM guruji_pujas WHERE "gurujiId"=$1`, [id]);
      profile = {id, ...profileData};
    } else {
      profile = await new DBStorage(client).createGurujiProfile(profileData as any);
    }
    for (const pujaId of pujaIds) {
      await client.query(
        `INSERT INTO guruji_pujas ("gurujiId","pujaId","isAvailable","createdAt","updatedAt")
         VALUES($1,$2,true,NOW(),NOW()) ON CONFLICT DO NOTHING`, [profile.id,pujaId],
      );
    }
    await client.query(`UPDATE guruji_profiles SET "isOnline"=$1,"isOffline"=$2,"isConsultation"=$3 WHERE id=$4`,
      [profileData.isOnline,profileData.isOffline,profileData.isConsultation,profile.id]);
    await client.query('COMMIT');
    req.session.userRole = 'guruji';
    await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    const safeUser = {...await storage.getUser(user.id)};
    delete (safeUser as any).password;
    try {
      const admins = await storage.getUsersByRole('admin');
      await Promise.all(admins.map(admin=>storage.createNotification({
        userId:admin.id,title:'New Guruji Application',
        message:`${data.firstName} ${data.lastName} has submitted a Guruji application. Please review and approve.`,
        type:'guruji_application',isRead:false,
      } as any)));
    } catch {console.error('Unable to notify admins about the submitted Guruji application');}
    res.status(201).json({message: 'Guruji application submitted for approval by the Sanatan Guruji support team', profile, user: safeUser});
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if ((error as any)?.code === '23505') return res.status(409).json({message: 'Email or mobile already registered'});
    res.status(500).json({message: 'Unable to submit your application'});
  } finally {
    client.release();
  }
}
