// Only allow the customer booking route as an authentication return target.
export function bookingReturnPath(candidate: string | null | undefined): string | undefined {
  if (!candidate?.startsWith('/') || candidate.startsWith('//')) return undefined;
  try {
    const url = new URL(candidate, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || url.pathname !== '/booking' && !/^\/services\/events\/\d+$/.test(url.pathname)) return undefined;
    return url.pathname + url.search;
  } catch {
    return undefined;
  }
}

export function currentBookingReturnPath(): string | undefined {
  const requested = new URLSearchParams(window.location.search).get('returnTo');
  return bookingReturnPath(requested) ||
    bookingReturnPath(window.location.pathname + window.location.search);
}

export function postAuthPath(role: string, returnTo = currentBookingReturnPath()): string {
  if (role === 'admin') return '/admin-dashboard';
  if (role === 'sales_rep' || role === 'sales') return '/sales-rep/dashboard';
  return role === 'customer' ? bookingReturnPath(returnTo) || '/dashboard' : '/dashboard';
}