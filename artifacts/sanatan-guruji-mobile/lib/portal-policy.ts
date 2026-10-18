/** No server credentials or user records belong in the native bundle. */
export type PortalConfig =
  | { ok: true; url: string; development: boolean }
  | { ok: false; reason: string };

export function resolvePortalConfig(input: {
  productionUrl?: string;
  developmentDomain?: string;
  development: boolean;
}): PortalConfig {
  const value = input.productionUrl?.trim();
  const candidate = value || (input.development && input.developmentDomain
    ? `https://${input.developmentDomain.trim()}`
    : '');
  if (!candidate) return { ok: false, reason: 'A verified live portal address must be configured before this app can be released.' };
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      return { ok: false, reason: 'The portal address must be an HTTPS origin, without credentials, paths or query parameters.' };
    }
    const developmentHost = /(?:^|\.)(?:replit\.dev|replit\.dev\.|localhost)$/.test(url.hostname) ||
      /(?:^|\.)(?:replit\.dev|replit\.app-preview\.com)$/.test(url.hostname) ||
      url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (!input.development && developmentHost) {
      return { ok: false, reason: 'A development address cannot be used in a release. Configure the verified production portal.' };
    }
    return { ok: true, url: url.origin + '/', development: !value || developmentHost };
  } catch {
    return { ok: false, reason: 'The configured portal address is not a valid HTTPS origin.' };
  }
}

export type NavigationDecision = 'internal' | 'external' | 'device' | 'blocked';

export function classifyNavigation(target: string, portal: string): NavigationDecision {
  if (!target || /[\u0000-\u0020\u007f]/.test(target)) return 'blocked';
  try {
    const url = new URL(target);
    if (url.username || url.password) return 'blocked';
    if (url.protocol === 'https:') {
      return url.origin === new URL(portal).origin ? 'internal' : 'external';
    }
    if (url.protocol === 'tel:') return /^tel:\+?[0-9().-]{3,30}$/i.test(target) ? 'device' : 'blocked';
    if (url.protocol === 'mailto:') return /^mailto:[^@\s?]+@[^@\s?]+\.[^@\s?]+(?:\?[^#]*)?$/i.test(target) ? 'device' : 'blocked';
    if (url.protocol === 'geo:') return /^geo:-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:[?;][^\s]*)?$/i.test(target) ? 'device' : 'blocked';
    return 'blocked';
  } catch { return 'blocked'; }
}

export function shouldHandleAndroidBack(canGoBack: boolean, rendererLost: boolean) {
  return canGoBack && !rendererLost;
}
