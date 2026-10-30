const supportTeam = 'Vaidik Dhara support team';

/**
 * Present historical system notifications using the participant-facing team name.
 * Do not rewrite stored audit records, role identifiers, names or reply content.
 */
export function participantNotification<T extends { title: string; message: string; type: string }>(
  notification: T, role?: string,
): T {
  if (role !== 'customer' && role !== 'guruji') return notification;
  let title = notification.title;
  if (title === 'Admin replied to your query') title = `${supportTeam} replied to your query`;
  if (title === 'Booking Request from Admin') title = 'Booking Request from Vaidik Dhara Support Team';

  let message = notification.message;
  if (notification.type !== 'query_reply') {
    if (message.startsWith('No eligible Guruji ') || message.startsWith('The requested Gurujis could not accept your puja.')) {
      message = message.replace(/\bthe admin has been alerted\b/gi, match =>
        `${match.startsWith('T') ? 'The' : 'the'} ${supportTeam} has been alerted`);
    }
    if (message.startsWith('Booking #')) {
      message = message
        .replace('Shared by admin.', `Shared by the ${supportTeam}.`)
        .replace('using an admin-shared OTP', `using an OTP shared by the ${supportTeam}`)
        .replace('by an admin override', `manually by the ${supportTeam}`);
    }
    if (message.startsWith('Admin shared your completion OTP for booking #')) {
      message = message.replace(/^Admin shared/, `The ${supportTeam} shared`);
    }
  }
  return { ...notification, title, message };
}
