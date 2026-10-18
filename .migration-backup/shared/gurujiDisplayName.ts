/** Customer-facing names omit honorifics and surnames even in legacy first-name data. */
export function gurujiFirstName(value: string | null | undefined): string {
  return (value || '').trim().replace(/^(?:(?:pandit|pundit|pt\.?|shri|sri)\s+)+/i, '').split(/\s+/)[0] || 'Guruji';
}
