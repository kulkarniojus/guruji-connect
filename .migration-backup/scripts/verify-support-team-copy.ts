import assert from 'node:assert/strict';
import { participantNotification } from '../server/supportTeamNotifications';

const original = {
  id: 1, title: 'Admin replied to your query', type: 'query_reply',
  message: 'Reply on booking #1: Your message mentioned admin. We have checked it.',
  isRead: false,
};
for (const role of ['customer', 'guruji']) {
  const reply = participantNotification(original, role);
  assert.equal(reply.title, 'Sanatan Guruji support team replied to your query');
  assert.equal(reply.message, original.message, 'Preserve actual reply content');
  assert.equal(reply.id, original.id);
  assert.equal(reply.isRead, original.isRead);

  for (const message of [
    'No eligible Guruji is currently available for your puja in Pune. The admin has been alerted to help.',
    'The requested Gurujis could not accept your puja. Your booking remains open and the admin has been alerted to help.',
    'Booking #1 exact address: Test address. Shared by admin.',
    'Admin shared your completion OTP for booking #1. Open the booking details to view it.',
    'Booking #1 was completed using an admin-shared OTP (independent customer confirmation bypassed).',
    'Booking #1 was completed by an admin override (not OTP verified).',
  ]) {
    const result = participantNotification({ title: 'Booking update', message, type: 'booking_update' }, role);
    assert.ok(result.message.includes('Sanatan Guruji support team'));
    assert.ok(!/\badmin\b/i.test(result.message));
  }
  assert.equal(participantNotification({ ...original, title: 'Booking Request from Admin' }, role).title,
    'Booking Request from Sanatan Guruji Support Team');
  const personal = { title: 'New booking', message: 'Customer Admin Kumar sent a message.', type: 'booking_request' };
  assert.deepEqual(participantNotification(personal, role), personal, 'Do not rename people or rewrite user content');
}
assert.equal(participantNotification(original, 'admin'), original);
assert.equal(participantNotification(original, 'sales'), original);
assert.equal(original.title, 'Admin replied to your query', 'Do not mutate stored audit history');
console.log('PASS: customer/Guruji support-team labels, historical notification templates, unchanged internal admin/sales copy, reply content and audit records');
