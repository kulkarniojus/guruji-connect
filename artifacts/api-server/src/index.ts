import express, { type Request, Response, NextFunction } from "express";
import { bookingPrivacyMiddleware } from './bookingPrivacy';
import { registerRoutes } from "./routes";
import { logger } from "./lib/logger";

const log = (message: string) => logger.info(message);

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled promise rejection (non-fatal):', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('Uncaught exception (non-fatal):', err?.message || err);
});

const app = express();
// The shared gateway terminates HTTPS; production session cookies remain secure.
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

// Real accounts and bookings always use persistent database storage.
async function initStorage() {
  if (process.env.DATABASE_URL) {
    try {
      const { dbStorage } = await import('./dbStorage');
      (global as any).appStorage = dbStorage;
      log("Connected to PostgreSQL database.");
    } catch (err: any) {
      throw new Error(`Database initialization failed: ${err.message}`);
    }
  } else {
    throw new Error('Persistent database configuration is required');
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Completion responses can contain a customer's private OTP or audit details.
      if (capturedJsonResponse && !/\/(?:completion|communications|notifications|bookings|booking-requests|addresses)(?:\/|$)/.test(path)) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Run after response logging is wrapped, so the logger only receives filtered data.
app.use(bookingPrivacyMiddleware);

(async () => {
  try {
    await initStorage();
  } catch (err) {
    log(`Error setting up application: ${err}`);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // The web artifact owns Vite and production SPA delivery.
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("A valid PORT environment variable is required");
  }
  server.once("error", (error) => {
    console.error(`Unable to start web server on port ${port}:`, error);
    process.exit(1);
  });
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
