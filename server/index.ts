import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { MemStorage } from "./storage";

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled promise rejection (non-fatal):', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('Uncaught exception (non-fatal):', err?.message || err);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use PostgreSQL in production (DATABASE_URL set), memory storage in dev fallback
async function initStorage() {
  if (process.env.DATABASE_URL) {
    try {
      const { dbStorage } = await import('./dbStorage');
      (global as any).appStorage = dbStorage;
      log("Connected to PostgreSQL database.");
    } catch (err: any) {
      log(`Database connection failed, falling back to memory storage: ${err.message}`);
      (global as any).appStorage = new MemStorage();
    }
  } else {
    (global as any).appStorage = new MemStorage();
    log("Using in-memory storage (no DATABASE_URL set).");
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
      if (capturedJsonResponse && !/\/completion(?:\/|$)/.test(path)) {
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

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
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
