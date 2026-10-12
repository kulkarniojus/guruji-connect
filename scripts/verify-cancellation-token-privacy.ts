import assert from 'node:assert/strict';
import { pool } from '../server/db';
import { cancellationQuote } from '../server/cancellationPolicy';
import { privateResponse,redactPhoneText } from '../server/bookingPrivacy';

if(process.env.NODE_ENV==='production') throw new Error('Development verification only');
try {
  // A deterministic valid digest containing digit runs that match the phone
  // scrubber: this must work regardless of randomly generated fixture hashes.
  const token='abcdef9876543210'+ 'a'.repeat(48);
  assert.equal(token.length,64);
  assert.notEqual(redactPhoneText(token),token);
  for(const role of ['guruji','customer']) {
    const response=await privateResponse({
      quoteToken:token,
      quote:{quoteToken:token},
      message:'Contact 9876543210 for help',
      mobile:'9876543210',
      arbitraryIdentifier:token,
      address:'Private address',
    },{role});
    assert.equal(response.quoteToken,token);
    assert.equal(response.quote.quoteToken,token);
    assert.equal(response.mobile,undefined);
    assert.ok(response.message.includes('[phone hidden]'));
    assert.ok(response.arbitraryIdentifier.includes('[phone hidden]'));
    if(role==='guruji') assert.equal(response.address,null);
    const malformed=await privateResponse({quoteToken:'9876543210'},{role});
    assert.equal(malformed.quoteToken,'[phone hidden]');
  }
  // Check the reported live booking read-only. Never actually withdraw it as
  // part of verification or impersonate its owner.
  const booking=(await pool.query('SELECT b.*,b.date::text AS calendar_date FROM bookings b WHERE id=266')).rows[0];
  if(booking) {
    const quote=await cancellationQuote(pool,booking,'guruji');
    const safe=await privateResponse(quote,{role:'guruji'});
    assert.equal(safe.quoteToken,quote.quoteToken);
    console.log('PASS: booking 266 confirmation token survives privacy filtering; no booking data or status changed');
  }
  console.log('PASS: valid nested quote tokens remain exact; phone fields, message phone numbers, other text and private Guruji addresses remain protected');
} finally {await pool.end();}
