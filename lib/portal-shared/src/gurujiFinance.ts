// All amounts in the admin API are INR. Positive net balance means Guruji
// owes the portal; negative means the portal owes Guruji. Records never move money.
export type FinanceDirection = 'guruji_owes_portal' | 'portal_owes_guruji';
export type FinanceCategory = 'fine' | 'expense' | 'extra_charge' | 'reimbursement' | 'adjustment' | 'settlement';
export interface FinanceEntryInput {
  gurujiId:number; category:FinanceCategory; direction:FinanceDirection;
  amount:number; occurredOn:string; description:string; bookingId?:number|null; reference?:string;
}
export interface FinanceReceiptInput {
  bookingId:number; receivedBy:'portal'|'guruji'; amount:number; receivedOn:string; reference:string; notes?:string;
}
export interface FinanceRecurringInput {
  name:string; amount:number; dayOfMonth:number; startMonth:string; endMonth?:string|null;
  gurujiIds:number[]|null; isActive:boolean;
}
export interface FinanceCaseInput {
  gurujiId:number; title:string; kind:'fraud'|'withdrawals'|'payment'|'other';
  severity:'low'|'medium'|'high'; status:'open'|'investigating'|'confirmed'|'dismissed'|'resolved';
  bookingId?:number|null; notes:string; evidenceReference?:string;
}
export interface GurujiFinanceReport {
  range:{from:string;to:string};
  summary:Record<string,number>;
  gurujis:any[]; directory:any[]; ledger:any[]; receipts:any[]; recurringRules:any[];
  cases:any[]; bookings:any[]; weekly:any[]; monthly:any[];
  notice:string;
}
