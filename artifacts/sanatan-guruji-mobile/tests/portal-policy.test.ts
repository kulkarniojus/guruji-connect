/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyNavigation, resolvePortalConfig, shouldHandleAndroidBack } from '../lib/portal-policy';

const origin = 'https://portal.example.test/';

test('hosted Stripe checkout stays in the portal WebView without trusting lookalikes',()=>{
  for(const host of ['checkout.stripe.com','hooks.stripe.com','payments.stripe.com'])
    assert.equal(classifyNavigation(`https://${host}/pay/test`,origin),'payment');
  assert.equal(classifyNavigation('https://checkout.stripe.com.evil.test/pay',origin),'external');
  assert.equal(classifyNavigation('http://checkout.stripe.com/pay',origin),'blocked');
  assert.equal(classifyNavigation('https://evil.test@checkout.stripe.com/pay',origin),'blocked');
});

test('release never falls back to the development portal', () => {
  assert.equal(resolvePortalConfig({ development: false, developmentDomain: 'fixture.replit.dev' }).ok, false);
  for (const value of ['https://fixture.replit.dev', 'http://portal.example.test', 'https://localhost',
    'https://127.0.0.1', 'https://user:pass@portal.example.test', origin + 'booking', origin + '?token=x']) {
    assert.equal(resolvePortalConfig({ development: false, productionUrl: value }).ok, false, value);
  }
});

test('development portal is labelled, and configured production is authoritative', () => {
  assert.deepEqual(resolvePortalConfig({ development: true, developmentDomain: 'fixture.replit.dev' }),
    { ok: true, url: 'https://fixture.replit.dev/', development: true });
  assert.deepEqual(resolvePortalConfig({ development: false, productionUrl: origin }),
    { ok: true, url: origin, development: false });
  assert.deepEqual(resolvePortalConfig({ development: true, productionUrl: origin, developmentDomain: 'fixture.replit.dev' }),
    { ok: true, url: origin, development: false });
});

test('the confirmed live portal origin takes precedence over any workspace host in release', () => {
  assert.deepEqual(resolvePortalConfig({
    development: false,
    productionUrl: 'https://vaidikdhara.com',
    developmentDomain: 'fixture.replit.dev',
  }), { ok: true, url: 'https://vaidikdhara.com/', development: false });
});

test('role pages, auth, files and booking return URLs stay on their real portal origin', () => {
  for (const path of ['booking?puja=1&returnTo=%2Fbooking', 'login', 'auth', 'guruji-dashboard',
    'admin-dashboard', 'sales-dashboard', 'api/admin/guruji-finance/export?section=ledger',
    'api/auth/login', 'api/auth/logout', 'notifications']) {
    assert.equal(classifyNavigation(origin + path, origin), 'internal');
  }
});

test('external HTTPS goes outside; lookalike domains never inherit trusted origin', () => {
  for (const value of ['https://maps.google.com/?q=Bangalore', 'https://portal.example.test.evil.test/',
    'https://portal.example.test:444/', 'https://other.example.test/']) {
    assert.equal(classifyNavigation(value, origin), 'external');
  }
});

test('approved device links are distinguished from unsafe URL schemes', () => {
  for (const value of ['tel:+919876543210', 'mailto:support@example.test', 'geo:12.97,77.59?q=Bangalore']) {
    assert.equal(classifyNavigation(value, origin), 'device', value);
  }
  for (const value of ['javascript:alert(1)', 'data:text/html,abc', 'file:///tmp/private',
    'content://contacts', 'intent://anything', 'http://portal.example.test', 'about:blank',
    '//evil.test', 'https://user:pass@evil.test', 'tel:abc', 'https://portal.example.test/\nsecret']) {
    assert.equal(classifyNavigation(value, origin), 'blocked', value);
  }
});

test('Android back consumes a usable portal history, not a dead renderer or root', () => {
  assert.equal(shouldHandleAndroidBack(true, false), true);
  assert.equal(shouldHandleAndroidBack(false, false), false);
  assert.equal(shouldHandleAndroidBack(true, true), false);
});

test('remote portal updates do not require rebuilding the native policy or source', async () => {
  // Local test server only: no web/backend source or customer data is changed.
  const { createServer } = await import('node:http');
  let revision = 'first';
  const server = createServer((_req, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.end(`<title>Portal ${revision}</title>`);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address() as { port: number };
    const url = `http://127.0.0.1:${address.port}/`;
    assert.match(await (await fetch(url)).text(), /first/);
    revision = 'updated';
    assert.match(await (await fetch(url)).text(), /updated/);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
