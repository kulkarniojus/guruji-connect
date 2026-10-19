import assert from 'node:assert/strict';
import { randomBytes,randomInt,randomUUID } from 'node:crypto';
import { DBStorage } from '../dbStorage';
import { pool } from '../db';
import { dispatchGurujiPush } from '../gurujiPush';
import type { PoolClient } from '@neondatabase/serverless';

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
if(!base.endsWith('.replit.dev'))throw new Error('Isolated development fixtures only');
const tag=`verify-push-${randomBytes(5).toString('hex')}`;
const store=new DBStorage(),users:number[]=[],profiles:number[]=[],bookings:number[]=[];
const password=randomBytes(16).toString('hex'),installationId=`${tag}-installation`;
const token=`ExpoPushToken[${randomBytes(24).toString('hex')}]`,projectId=randomUUID();
async function api(path:string,cookie?:string,method='GET',body?:unknown) {
  const response=await fetch(base+path,{method,headers:{
    ...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{}),
  },body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function account(role:'customer'|'guruji') {
  const user=await store.createUser({firstName:tag,lastName:'Verification',email:`${tag}-${role}-${randomBytes(4).toString('hex')}@example.invalid`,
    mobile:`9${randomInt(100000000,999999999)}`,password,role,age:30,gender:'other'} as any);
  users.push(user.id);
  const result=await api('/api/auth/login',undefined,'POST',{email:user.email,password});
  assert.equal(result.status,200);assert.ok(result.cookie);
  return {...user,cookie:result.cookie!};
}
let client:PoolClient|undefined;
let pujaId:number|undefined;
try {
  const [customer,guruji,other]=await Promise.all([account('customer'),account('guruji'),account('guruji')]);
  const input={installationId,token,projectId,platform:'android',accountId:guruji.id};
  assert.equal((await api('/api/mobile/push',undefined,'PUT',input)).status,401);
  assert.equal((await api('/api/mobile/push',customer.cookie,'PUT',input)).status,403);
  assert.equal((await api('/api/mobile/push',guruji.cookie,'PUT',{...input,token:'bad'})).status,400);
  assert.equal((await api('/api/mobile/push',guruji.cookie,'PUT',{...input,accountId:other.id})).status,409);
  assert.deepEqual((await api('/api/mobile/push',guruji.cookie,'PUT',input)).data,{enabled:true});
  assert.equal((await api('/api/mobile/push',guruji.cookie,'PUT',input)).status,200,'Registration replay is idempotent');
  assert.deepEqual((await api('/api/mobile/push',guruji.cookie,'DELETE',{installationId})).data,{enabled:false});
  await api('/api/mobile/push',guruji.cookie,'PUT',input);
  for(const user of [guruji,other]) {
    const profile=await store.createGurujiProfile({userId:user.id,city:tag,experience:5,pricePerHour:500,
      isAvailable:true,isVerified:true,status:'approved',isOnline:true,languages:['Hindi']} as any);
    profiles.push(profile.id);
  }
  const puja=await store.createPuja({name:tag,description:'Isolated push test fixture',type:'online',
    basePrice:100,price:100,duration:60,isActive:false} as any);
  pujaId=puja.id;
  const b=await store.createBooking({customerId:customer.id,pujaId,type:'online',amount:100,
    date:new Date(Date.now()+72*3600000),time:'10:00 AM',status:'pending',duration:60} as any);
  bookings.push(b.id);
  client=await pool.connect();
  await client.query('BEGIN');
  // All request/outbox rows below stay UNCOMMITTED. The running worker cannot
  // see/send them. Provider calls are replaced; no test or real push is sent.
  const query=async(text:string,values?:any[])=>{
    if(text==='BEGIN')text='SAVEPOINT push_dispatch';
    else if(text==='COMMIT')text='RELEASE SAVEPOINT push_dispatch';
    else if(text==='ROLLBACK')text='ROLLBACK TO SAVEPOINT push_dispatch';
    if(text.includes("WHERE q.status='queued'"))text=text.replace(
      "WHERE q.status='queued'",`WHERE q.user_id=${guruji.id} AND q.status='queued'`);
    return client!.query(text,values);
  };
  const adapter={query,connect:async()=>({query,release:()=>{}})} as unknown as typeof pool;
  const sent:any[]=[];
  const fakeSend=async(messages:any[])=>{
    sent.push(...messages);
    return messages.map(()=>({status:'ok' as const,id:randomUUID()}));
  };
  async function request(status='pending',profile=profiles[0]) {
    const row=(await client!.query(`INSERT INTO booking_requests
      ("bookingId","gurujiId",status,"createdAt","updatedAt") VALUES($1,$2,$3,NOW(),NOW()) RETURNING id`,
      [b.id,profile,status])).rows[0];
    return Number(row.id);
  }
  const first=await request();
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM guruji_push_deliveries WHERE request_id=$1',[first])).rows[0].n,1);
  const ignored=await request('declined');
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM guruji_push_deliveries WHERE request_id=$1',[ignored])).rows[0].n,0);
  const noDevice=await request('pending',profiles[1]);
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM guruji_push_deliveries WHERE request_id=$1',[noDevice])).rows[0].n,0);
  assert.equal(await dispatchGurujiPush(fakeSend,adapter),1);
  assert.equal(await dispatchGurujiPush(fakeSend,adapter),0,'No duplicate push on repeated worker ticks');
  assert.equal(sent.length,1);assert.equal(sent[0].sound,'default');assert.equal(sent[0].priority,'high');
  assert.equal(sent[0].channelId,'guruji-puja-requests');assert.equal(sent[0].data.requestId,first);
  assert.equal(sent[0].data.userId,guruji.id);
  assert.equal(JSON.stringify(sent[0]).includes('address'),false,'No customer address or phone in lockscreen payload');
  async function suppressed(mutate:(id:number)=>Promise<unknown>,restore:()=>Promise<unknown>=async()=>{}) {
    const id=await request();
    await mutate(id);
    assert.equal(await dispatchGurujiPush(fakeSend,adapter),0);
    await client!.query("UPDATE booking_requests SET status='declined' WHERE id=$1",[id]);
    await restore();
  }
  await suppressed(id=>client!.query("UPDATE booking_requests SET status='accepted' WHERE id=$1",[id]));
  await suppressed(()=>client!.query("UPDATE bookings SET status='cancelled' WHERE id=$1",[b.id]),
    ()=>client!.query("UPDATE bookings SET status='pending' WHERE id=$1",[b.id]));
  await suppressed(()=>client!.query('UPDATE guruji_push_devices SET enabled=FALSE WHERE user_id=$1',[guruji.id]),
    ()=>client!.query('UPDATE guruji_push_devices SET enabled=TRUE WHERE user_id=$1',[guruji.id]));
  await suppressed(()=>client!.query('UPDATE users SET "isBlocked"=TRUE WHERE id=$1',[guruji.id]),
    ()=>client!.query('UPDATE users SET "isBlocked"=FALSE WHERE id=$1',[guruji.id]));
  await suppressed(()=>client!.query('UPDATE guruji_push_devices SET user_id=$1 WHERE installation_id=$2',[other.id,installationId]),
    ()=>client!.query('UPDATE guruji_push_devices SET user_id=$1 WHERE installation_id=$2',[guruji.id,installationId]));
  await suppressed(id=>client!.query("UPDATE guruji_push_deliveries SET created_at=NOW()-INTERVAL '6 minutes' WHERE request_id=$1",[id]));
  await suppressed(()=>client!.query("UPDATE user_sessions SET expire=NOW()-INTERVAL '1 minute' WHERE sess->>'userId'=$1",[String(guruji.id)]),
    ()=>client!.query("UPDATE user_sessions SET expire=NOW()+INTERVAL '1 day' WHERE sess->>'userId'=$1",[String(guruji.id)]));
  const uncertain=await request();
  assert.equal(await dispatchGurujiPush(async()=>{throw new Error('Simulated network failure');},adapter),1);
  assert.equal((await client.query('SELECT status FROM guruji_push_deliveries WHERE request_id=$1',[uncertain])).rows[0].status,'unknown');
  assert.equal(await dispatchGurujiPush(fakeSend,adapter),0,'Ambiguous provider failures are not retried');
  const invalid=await request();
  await dispatchGurujiPush(async messages=>messages.map(()=>({status:'error',details:{error:'DeviceNotRegistered'}})),adapter);
  assert.equal((await client.query('SELECT enabled FROM guruji_push_devices WHERE installation_id=$1',[installationId])).rows[0].enabled,false);
  assert.equal((await client.query('SELECT status FROM guruji_push_deliveries WHERE request_id=$1',[invalid])).rows[0].status,'failed');
  await client.query('ROLLBACK');client.release();client=undefined;
  await api('/api/auth/logout',guruji.cookie,'POST');
  client=await pool.connect();await client.query('BEGIN');
  const loggedOut=await request();
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM guruji_push_deliveries WHERE request_id=$1',[loggedOut])).rows[0].n,0,'Logout invalidates push destination');
  await client.query('ROLLBACK');client.release();client=undefined;
  console.log('PASS: authenticated opt-in/disable, role/account isolation, transactional request enqueue, single sound alert, no historical/device-less pushes, pending/cancelled/blocked/expired/logout guards, stale suppression, no duplicate retry and invalid-token retirement. No external push sent.');
} finally {
  if(client){await client.query('ROLLBACK');client.release();}
  await pool.query('DELETE FROM guruji_push_devices WHERE user_id=ANY($1::int[])',[users]);
  await pool.query('DELETE FROM booking_requests WHERE "bookingId"=ANY($1::int[])',[bookings]);
  await pool.query('DELETE FROM bookings WHERE id=ANY($1::int[])',[bookings]);
  if(pujaId)await pool.query('DELETE FROM pujas WHERE id=$1',[pujaId]);
  await pool.query('DELETE FROM guruji_profiles WHERE id=ANY($1::int[])',[profiles]);
  await pool.query("DELETE FROM user_sessions WHERE sess->>'userId'=ANY($1::text[])",[users.map(String)]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[users]);
  await pool.end();
}
