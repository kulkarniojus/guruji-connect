# Sanatan Guruji Mobile

Separate Expo/React Native app for Android and iOS. The portal is loaded inside a native WebView, not copied into independently maintained mobile screens. The original web and API artifacts are unchanged by this mobile implementation; the legacy `mobile/` folder is retained.

## Same portal, accounts and database

The WebView loads the portal's HTTPS origin. Its existing forms, APIs, session cookies, Socket.IO notifications, authorization and database remain authoritative. No database credentials or duplicate accounts are in the mobile app. Signing in here does not automatically sign in a separate browser, but the same account works in both.

Published portal changes appear on the next page load/reload; unsaved or unpublished development changes do not change production. The native **Reload** action asks before replacing a page, to avoid silently discarding unfinished forms. Native permissions, shell changes and new native integrations may still require an app update.

## Development

- Select **Sanatan Guruji Mobile** and use its managed Expo workflow / **Preview on your phone**.
- The scaffold supplies `EXPO_PUBLIC_DOMAIN` from the workspace's development host. This is used only in development and is clearly labelled in the app. Web and API workflows must also be running.
- The browser preview uses an iframe and labels itself as a browser preview. Browser restrictions can block third-party sessions; use **Open portal** for direct browser testing.
- An iframe or successful native bundle export is **not** evidence of a working Android/iOS WebView. Verify the native app in Expo Go / a device build.
- Do not run a second Expo development server or start the obsolete legacy mobile app.

## Release configuration — deliberately not invented

This project reported no active published portal URL when this app was built. Configure `EXPO_PUBLIC_PORTAL_URL` to your **verified live HTTPS portal origin**, for example your own real domain with no path, credentials or query parameters. It is public configuration, not a secret. Never put database URLs, session secrets, access tokens or passwords in any `EXPO_PUBLIC_` setting.

Production builds do not fall back to development. With an absent or development portal address they show **Live portal setup required**, instead of connecting to the wrong database/environment. Public Expo variables are embedded at bundle/build time: restart the mobile workflow after configuring them and rebuild a release after changing its origin.

Before a release:

1. Confirm the live portal URL, ownership, availability, HTTPS and intended database environment.
2. Confirm your organization-owned iOS bundle identifier and Android package name, then configure them in static `app.json`. They are intentionally unset rather than inventing an organization's identity.
3. Run `node scripts/verify-release.mjs` from this directory. It is a configuration check, not an automatic build/submission or proof of domain ownership.
4. Verify device scenarios below and prepare accurate privacy disclosures, support/privacy-policy URLs and requested permissions. A portal wrapper can require additional native value to meet app-store review requirements; approval is not guaranteed.
5. Use Replit's publishing interface / Expo Launch for iOS release preparation and submission. Credentials and signing belong in the supported publishing flow, never source code or chat. This repository does not contain signed binaries. Android source/bundles are included, but Google Play submission needs a separately supported release process; do not mistake an Expo Go preview for an installable store release.

Do not create dynamic `app.config.js`/`app.config.ts`, remove the managed Expo login step, run manual EAS authentication or publish automatically.

## Verification

- Mobile TypeScript check: `pnpm --filter @workspace/sanatan-guruji-mobile run typecheck`.
- Policy tests: from the workspace, run the TypeScript test with the workspace's `tsx` runner and Node test mode.
- Native export: run Expo export for iOS/Android into ignored `generated-artifacts/` or a temporary directory. This checks JavaScript/asset bundling, not a signed native binary or device behavior.
- The remote-update fixture test changes only its temporary HTTP server response; it never changes the portal, database, business settings or real user data.

### Required device release checks

Check genuine customer/Guruji/sales/admin login/logout, persistent sign-in after app restart, registration errors, role isolation, guest booking through Guruji selection and authentication return, mandatory pincode, readonly customer samagri, specific and automatic Guruji selection, in-app notifications, availability, cancellations, finance, protected CSV/PDF downloads and uploads. Use isolated test accounts; do not create paid real bookings or alter real balances.

Check camera/photo/document selection, permission denial, optional location, microphone/video calls where enabled, external maps/phone/mail links, `target="_blank"` links, Android back and iOS gestures, offline/retry, interrupted submissions and renderer recovery. Renderer loss requires an explicit reopen; unsaved entries cannot be guaranteed recoverable.

Current portal credentials use the existing first-party session login. A future external OAuth/provider login must be separately tested and integrated correctly; opening a provider in the system browser does not automatically transfer its login into the WebView. Background native push is not added; existing portal notifications work while the portal is running.

## Navigation security

All requested navigation is inspected, including otherwise unknown schemes. Only the configured HTTPS origin can replace the top-level portal page. Existing HTTPS map/video subframes may render within that page without opening a browser unexpectedly. External top-level HTTPS and approved `tel:`, `mailto:` and `geo:` links go to device applications. Other schemes, embedded URL credentials, file access, mixed content and universal local-file access are blocked. No authentication bypasses or injected fake user identities are used.
