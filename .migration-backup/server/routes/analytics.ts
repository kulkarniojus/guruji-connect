import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, checkRole } from '../middlewares/auth';
import { isSampleAccount } from '../authAccess';

export const analyticsRouter = Router();
analyticsRouter.use(isAuthenticated, checkRole(['admin']));

function countBy(rows: any[], field: string, label = field) {
  const counts = new Map<string, number>();
  rows.forEach(row => {
    const key = String(row[field] || 'Not provided');
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts, ([value, count]) => ({[label]: value, count}));
}
function trend(rows: any[], key: string, dateField = 'createdAt', valueField?: string) {
  const totals = new Map<string, number>();
  rows.forEach(row => {
    if (!row[dateField]) return;
    const date = new Date(row[dateField]);
    if (Number.isNaN(date.getTime())) return;
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(date);
    const month = `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;
    totals.set(month,(totals.get(month)||0)+(valueField ? Number(row[valueField]) || 0 : 1));
  });
  return Array.from(totals).sort(([a],[b])=>a.localeCompare(b)).map(([month,amount])=>({month,[key]:amount}));
}
async function realUsers() {
  return (await storage.getAllUsers()).filter(u=>!isSampleAccount(u.email || ''));
}

analyticsRouter.get('/overview', async (_req,res) => {
  try {
    const [users,bookings,pujas,payments,reviews] = await Promise.all([
      realUsers(),storage.getAllBookings(),storage.getAllPujas(),storage.getAllPayments(),storage.getAllReviews(),
    ]);
    const recent = Date.now()-30*86_400_000;
    const paid = payments.filter(p=>p.status==='paid');
    res.json({
      totalUsers:users.length,totalBookings:bookings.length,totalPujas:pujas.length,
      totalGurujis:users.filter(u=>u.role==='guruji').length,
      totalRevenue:paid.reduce((sum,p)=>sum+p.amount,0),
      newUsers30Days:users.filter(u=>new Date(u.createdAt!).getTime()>=recent).length,
      newBookings30Days:bookings.filter(b=>b.createdAt && new Date(b.createdAt).getTime()>=recent).length,
      revenue30Days:paid.filter(p=>p.createdAt && new Date(p.createdAt).getTime()>=recent).reduce((sum,p)=>sum+p.amount,0),
      averageRating:reviews.length ? reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length : 0,
      activeWhatsappUsers:null,
    });
  } catch {res.status(500).json({message:'Unable to load real overview data'});}
});
analyticsRouter.get('/users', async (_req,res) => {
  try {
    const users = await realUsers();
    res.json({
      growth:trend(users,'newUsers'),byRole:countBy(users,'role'),byCity:countBy(users,'city'),
      byAge:countBy(users.map(u=>({...u,ageGroup: u.age ? `${Math.floor(u.age/10)*10}-${Math.floor(u.age/10)*10+9}` : 'Not provided'})),'ageGroup'),
    });
  } catch {res.status(500).json({message:'Unable to load real user data'});}
});
analyticsRouter.get('/bookings', async (_req,res) => {
  try {
    const [bookings,pujas] = await Promise.all([storage.getAllBookings(),storage.getAllPujas()]);
    const counts = countBy(bookings.map(b=>({...b,pujaName:pujas.find(p=>p.id===b.pujaId)?.name || 'Unavailable puja'})),'pujaName','name');
    res.json({
      trends:trend(bookings,'count'),byStatus:countBy(bookings,'status'),byCity:countBy(bookings,'city'),
      popularPujas:counts.sort((a,b)=>Number(b.count)-Number(a.count)).slice(0,5),
      averageValue:bookings.length ? bookings.reduce((sum,b)=>sum+b.amount,0)/bookings.length : 0,
      completionRate:bookings.length ? bookings.filter(b=>b.status==='completed').length/bookings.length*100 : 0,
    });
  } catch {res.status(500).json({message:'Unable to load real booking data'});}
});
analyticsRouter.get('/revenue', async (_req,res) => {
  try {
    const [payments,bookings,pujas,users,profiles] = await Promise.all([
      storage.getAllPayments(),storage.getAllBookings(),storage.getAllPujas(),realUsers(),storage.getAllGurujiProfiles(),
    ]);
    const paid = payments.filter(p=>p.status==='paid');
    const byType = new Map<string,number>(),byGuruji = new Map<number,{name:string;revenue:number;bookings:Set<number>}>();
    for (const payment of paid) {
      const booking = bookings.find(b=>b.id===payment.bookingId);
      const type = pujas.find(p=>p.id===booking?.pujaId)?.type || booking?.type || 'Not provided';
      byType.set(type,(byType.get(type)||0)+payment.amount);
      if (booking?.gurujiId) {
        const profile = profiles.find(p=>p.id===booking.gurujiId);
        const user = users.find(u=>u.id===profile?.userId);
        const current = byGuruji.get(booking.gurujiId) || {name:user ? `${user.firstName} ${user.lastName}` : 'Unavailable account',revenue:0,bookings:new Set<number>()};
        current.revenue+=payment.amount; current.bookings.add(booking.id); byGuruji.set(booking.gurujiId,current);
      }
    }
    res.json({
      trends:trend(paid,'revenue','createdAt','amount'),
      byPujaType:Array.from(byType,([pujaType,revenue])=>({pujaType,revenue})),
      byPaymentMethod:countBy(paid,'paymentMethod','method'),
      topGurujis:Array.from(byGuruji.values()).map(g=>({name:g.name,revenue:g.revenue,bookingCount:g.bookings.size})).sort((a,b)=>b.revenue-a.revenue).slice(0,5),
    });
  } catch {res.status(500).json({message:'Unable to load real revenue data'});}
});
// These dashboards had invented metrics. Until telemetry is implemented,
// explicitly report unavailable metrics rather than pretending they are zero.
analyticsRouter.get('/chatbot', (_req,res) => res.json({available:false,message:'Chatbot usage metrics are not recorded yet.'}));
analyticsRouter.get('/video', (_req,res) => res.json({available:false,message:'Video usage metrics are not recorded yet.'}));
