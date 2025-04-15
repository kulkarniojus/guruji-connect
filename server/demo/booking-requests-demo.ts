import { storage } from '../storage';
import { InsertUser, InsertGurujiProfile, InsertPuja, InsertBooking, InsertBookingRequest } from '@shared/schema';
import { hash } from 'bcrypt';

/**
 * Creates demo data for testing the booking request notification flow
 */
export async function createBookingRequestDemoData() {
  console.log('Creating demo data for booking request notification flow...');
  
  // Check if demo data already exists
  const demoCustomer = await storage.getUserByEmail('demo.customer@example.com');
  const demoGuruji1 = await storage.getUserByEmail('demo.guruji1@example.com');
  
  if (demoCustomer && demoGuruji1) {
    console.log('Demo data already exists, skipping creation');
    
    // Get existing booking or create a new one
    const booking = await getOrCreateDemoBooking(demoCustomer.id);
    
    return {
      customer: demoCustomer,
      booking
    };
  }
  
  // Create demo customer
  const hashedPassword = await hash('demo123', 10);
  const customerData: InsertUser = {
    firstName: 'Demo',
    lastName: 'Customer',
    email: 'demo.customer@example.com',
    mobile: '9876543210',
    password: hashedPassword,
    age: 35,
    gender: 'male',
    role: 'customer',
    address: '123 Demo Street',
    city: 'Mumbai',
    state: 'Maharashtra',
  };
  
  const customer = await storage.createUser(customerData);
  
  // Create demo gurujis
  const gurujiUsers = [];
  for (let i = 1; i <= 3; i++) {
    const gurujiData: InsertUser = {
      firstName: `Demo Guruji ${i}`,
      lastName: 'Sharma',
      email: `demo.guruji${i}@example.com`,
      mobile: `987654321${i}`,
      password: hashedPassword,
      age: 45 + i,
      gender: 'male',
      role: 'guruji',
      address: `${i}23 Temple Street`,
      city: 'Mumbai',
      state: 'Maharashtra',
    };
    
    const guruji = await storage.createUser(gurujiData);
    gurujiUsers.push(guruji);
    
    // Create guruji profile
    const profileData: InsertGurujiProfile = {
      userId: guruji.id,
      experience: 15 + i,
      specialization: 'Vedic Rituals, Navgraha Shanti',
      location: 'Mumbai',
      bio: `I am a ${15 + i} years experienced guruji specializing in traditional vedic ceremonies and rituals.`,
      isAvailable: true,
      aadharVerified: true,
      documentsVerified: true,
      radius: 25,
    };
    
    await storage.createGurujiProfile(profileData);
  }
  
  // Create a demo puja if not exists
  let demoPuja = await getPujaByName('Demo Griha Pravesh');
  if (!demoPuja) {
    const pujaData: InsertPuja = {
      name: 'Demo Griha Pravesh',
      description: 'A demo housewarming ceremony performed before entering a new home.',
      type: 'offline',
      basePrice: 2000,
      price: 2000,
      duration: 180, // 3 hours
      imageUrl: 'https://images.unsplash.com/photo-1599946347960-dbf2caca5ba5',
      isPopular: true,
      isActive: true,
      items: ['Coconut', 'Flowers', 'Incense sticks', 'Ghee', 'Rice'],

    };
    
    demoPuja = await storage.createPuja(pujaData);
  }
  
  // Create a demo booking
  const booking = await getOrCreateDemoBooking(customer.id, demoPuja.id);
  
  console.log('Demo data created successfully');
  
  return { customer, booking };
}

async function getPujaByName(name: string) {
  const pujas = await storage.getAllPujas();
  return pujas.find(p => p.name === name);
}

async function getOrCreateDemoBooking(customerId: number, pujaId?: number) {
  // Check if a demo booking already exists
  const customerBookings = await storage.getBookingsByCustomerId(customerId);
  const demoBooking = customerBookings.find(b => b.status === 'pending');
  
  if (demoBooking) {
    return demoBooking;
  }
  
  // If no puja ID is provided, get the first puja
  if (!pujaId) {
    const pujas = await storage.getAllPujas();
    pujaId = pujas[0]?.id || 1;
  }
  
  // Create a new demo booking
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  tomorrowDate.setHours(10, 0, 0, 0);
  
  const bookingData: InsertBooking = {
    customerId,
    pujaId,
    type: 'offline',
    amount: 2000,
    address: '123 Demo Street, Apartment 4B',
    city: 'Mumbai',
    date: tomorrowDate,
    duration: 180,
  };
  
  return await storage.createBooking(bookingData);
}

export async function getDemoGurujiProfiles() {
  const gurujiUsers = await Promise.all([
    storage.getUserByEmail('demo.guruji1@example.com'),
    storage.getUserByEmail('demo.guruji2@example.com'),
    storage.getUserByEmail('demo.guruji3@example.com')
  ]);
  
  const gurujiProfiles = [];
  for (const user of gurujiUsers.filter(Boolean)) {
    if (user) {
      const profile = await storage.getGurujiProfileByUserId(user.id);
      if (profile) {
        gurujiProfiles.push({
          ...profile,
          user
        });
      }
    }
  }
  
  return gurujiProfiles;
}

export async function getOrCreateDemoBookingRequests(bookingId: number) {
  // Check if booking requests already exist
  const existingRequests = await storage.getBookingRequestsByBookingId(bookingId);
  if (existingRequests.length > 0) {
    return existingRequests;
  }
  
  // Create new booking requests
  const gurujiProfiles = await getDemoGurujiProfiles();
  const requests = [];
  
  for (const profile of gurujiProfiles) {
    const requestData: InsertBookingRequest = {
      bookingId,
      gurujiId: profile.id,
    };
    
    const request = await storage.createBookingRequest(requestData);
    requests.push(request);
    
    // Create notification for the guruji
    await storage.createNotification({
      userId: profile.userId,
      title: 'New Demo Booking Request',
      message: 'You have a new demo booking request for testing purposes.',
      type: 'booking_request',
    });
  }
  
  return requests;
}