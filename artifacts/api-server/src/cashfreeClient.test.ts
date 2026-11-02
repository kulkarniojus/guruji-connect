import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  cashfreeGatewayStatus, cashfreeRequest, createCashfreeOrder, createCashfreeRefund,
  isVerifiedCashfreePayment, verifyCashfreeWebhookSignature,
} from './cashfreeClient';

// Isolated process fixtures, never merchant credentials or real network calls.
process.env.CASHFREE_SANDBOX_APP_ID='fixture-sandbox-app';
process.env.CASHFREE_SANDBOX_SECRET_KEY='fixture-sandbox-secret';
process.env.CASHFREE_PRODUCTION_APP_ID='fixture-live-app';
process.env.CASHFREE_PRODUCTION_SECRET_KEY='fixture-live-secret';
process.env.CASHFREE_MODE='sandbox';
process.env.NODE_ENV='development';

test('published deployments cannot accept sandbox payments',()=>{
  assert.deepEqual(cashfreeGatewayStatus(),{available:true,mode:'test'});
  process.env.NODE_ENV='production';
  assert.deepEqual(cashfreeGatewayStatus(),{available:false,mode:'unavailable'});
  process.env.CASHFREE_MODE='production';
  process.env.NODE_ENV='development';
  assert.deepEqual(cashfreeGatewayStatus(),{available:false,mode:'unavailable'});
  process.env.NODE_ENV='production';
  assert.deepEqual(cashfreeGatewayStatus(),{available:true,mode:'live'});
  process.env.NODE_ENV='development';
  process.env.CASHFREE_MODE='sandbox';
});

test('development servers cannot call Cashfree production credentials',async()=>{
  process.env.NODE_ENV='development';
  process.env.CASHFREE_MODE='production';
  assert.deepEqual(cashfreeGatewayStatus(),{available:false,mode:'unavailable'});
  await assert.rejects(cashfreeRequest('GET','/orders/fixture-order',true),
    /only to the published production server/);
  process.env.CASHFREE_MODE='sandbox';
});

test('Cashfree webhook signatures cover timestamp plus exact raw bytes',()=>{
  const raw=Buffer.from('{"amount":100.00,"status":"SUCCESS"}');
  const timestamp='1700000000000';
  const signature=createHmac('sha256','fixture-sandbox-secret').update(timestamp).update(raw).digest('base64');
  assert.equal(verifyCashfreeWebhookSignature(raw,timestamp,signature,false),true);
  assert.equal(verifyCashfreeWebhookSignature(Buffer.from('{"amount":100,"status":"SUCCESS"}'),timestamp,signature,false),false);
  assert.equal(verifyCashfreeWebhookSignature(raw,timestamp+'1',signature,false),false);
  assert.equal(verifyCashfreeWebhookSignature(raw,timestamp,signature,true),false);
  assert.equal(verifyCashfreeWebhookSignature(raw,timestamp,'invalid',false),false);
});

test('only a successful, matching INR payment can fulfill a booking',()=>{
  const order={order_id:'fixture-order',order_amount:750.25,order_currency:'INR',order_status:'PAID'};
  const payment={order_id:'fixture-order',cf_payment_id:'fixture-payment',order_amount:750.25,order_currency:'INR',
    payment_amount:750.25,payment_currency:'INR',payment_status:'SUCCESS',is_captured:true};
  assert.equal(isVerifiedCashfreePayment(order,payment,'fixture-order',75025),true);
  for (const change of [
    {payment_status:'FAILED'},{payment_status:'PENDING'},{order_id:'another-order'},
    {payment_amount:750},{payment_currency:'USD'},{order_currency:'USD'},
    {is_captured:false},{cf_payment_id:''},
  ]) assert.equal(isVerifiedCashfreePayment(order,{...payment,...change},'fixture-order',75025),false);
  assert.equal(isVerifiedCashfreePayment({...order,order_status:'ACTIVE'},payment,'fixture-order',75025),false);
  assert.equal(isVerifiedCashfreePayment(order,payment,'fixture-order',75026),false);
});

test('lost order/refund responses recover the original id without another POST',async()=>{
  const realFetch=globalThis.fetch;
  const calls:{url:string;method:string}[]=[];
  globalThis.fetch=async(input,init)=>{
    const url=String(input); const method=init?.method||'GET';
    calls.push({url,method});
    if (method==='POST') throw new Error('simulated lost response');
    return new Response(JSON.stringify(url.includes('/refunds/')
      ?{order_id:'fixture-order',refund_id:'fixture-refund',refund_amount:1,refund_status:'PENDING'}
      :{order_id:'fixture-order',order_amount:1,order_currency:'INR',order_status:'ACTIVE',payment_session_id:'fixture-session'}),
      {status:200,headers:{'content-type':'application/json'}});
  };
  try {
    const order=await createCashfreeOrder({order_id:'fixture-order',order_amount:1},false);
    assert.equal(order.order_id,'fixture-order');
    const refund=await createCashfreeRefund('fixture-order','fixture-refund',100,false);
    assert.equal(refund.refund_id,'fixture-refund');
    assert.equal(calls.filter(c=>c.method==='POST').length,2);
    assert.ok(calls.every(c=>c.url.startsWith('https://sandbox.cashfree.com/pg/')));
  } finally { globalThis.fetch=realFetch; }
});
