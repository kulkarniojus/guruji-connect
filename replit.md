# Vaidik Dhara

Existing web portal for puja bookings, Guruji availability, customer and staff accounts, notifications, pricing, cancellation, commissions and Guruji Finance.

## Run and operate

- Start the managed workflows `artifacts/api-server: API Server` and `artifacts/sanatan-guruji: web`.
- The web portal is at `/`; the backend owns `/api` and `/socket.io`.
- Deployment remains an autoscaled application: the web artifact serves the built SPA and the API artifact runs the existing Express/Socket.IO backend.
- Do not run a root development server or publish as part of the structural port.

## Database and authentication

- Preserve the existing external PostgreSQL adapter and its `DATABASE_URL` reference, plus `SESSION_SECRET`.
- `NEON_DATABASE_URL` also remains an existing workspace secret; do not replace or disclose connection settings.
- Sessions use the existing PostgreSQL `user_sessions` store. Production cookies remain secure behind the shared HTTPS gateway.
- The physical database differs from the shared models. **Do not run DB push, reconcile the schema, create another application database, or copy production data.**
- The scaffold `lib/db` package is not the portal's active adapter. The portal continues using its original backend storage implementation.
- Post-merge setup installs dependencies only; it must not push a database schema.

## Workspace

- `artifacts/sanatan-guruji`: original React frontend, styles, public images and custom request/query layer.
- `artifacts/api-server/src`: original backend and business logic, with workspace startup wiring.
- `lib/portal-shared`: original browser-safe shared models and helpers, without a database connection.
- `mobile/`: retained original mobile project for the follow-up; not a replacement app and not part of web deployment.
- `.migration-backup/`: retained migration input, excluded from application deployment.
- `attached_assets/` and generated output are not bundled into the application. Required portal images live in its public directory.

## Scope

The user wants separate Android/iOS apps sharing the live portal and database without changing existing web behavior. This structural port does not build those apps. Ask the user to verify web parity before proceeding with mobile work.

Preserve the existing booking wizard, genuine session authentication and Guruji acceptance, availability, pricing, cancellation, notification, commission and finance behavior. Do not rewrite API contracts or replace legacy validation during a structural move.
