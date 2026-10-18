import fs from 'node:fs';

const errors = [];
const value = process.env.EXPO_PUBLIC_PORTAL_URL?.trim();
try {
  const url = new URL(value || '');
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
    url.search || url.hash || /(?:^|\.)(replit\.dev|localhost)$/.test(url.hostname) ||
    ['127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error();
} catch { errors.push('Set EXPO_PUBLIC_PORTAL_URL to the verified HTTPS production portal origin (not a development URL).'); }
const config = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url))).expo;
if (!config.ios?.bundleIdentifier) errors.push('Confirm and configure the iOS bundle identifier owned by your organization.');
if (!config.android?.package) errors.push('Confirm and configure the Android package name owned by your organization.');
if (errors.length) {
  console.error(`Release is NOT configured:\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else console.log('Release configuration present. Verify portal ownership, store policies, signing and device behavior before publishing.');
