import "dotenv/config";
import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerArenaRoutes } from "../index";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Ensure JWT_SECRET is at least 32 chars; if shorter, derive a strong key via HMAC
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is missing. A JWT_SECRET is required in production.");
    }
    console.warn("[WARN] JWT_SECRET is missing. Set a strong JWT_SECRET in production.");
  } else if (process.env.JWT_SECRET.length < 32) {
    const derived = crypto.createHmac("sha256", "otter-trader-key-derivation")
      .update(process.env.JWT_SECRET)
      .digest("hex");
    process.env.JWT_SECRET = derived;
    console.log(`[INFO] JWT_SECRET was short (${process.env.JWT_SECRET.length} chars before derivation), derived a 64-char key via HMAC-SHA256.`);
  }

  const app = express();
  const server = createServer(app);
  // In development, Vite injects inline scripts and uses eval for HMR,
  // so we must relax CSP. In production, use strict defaults.
  if (process.env.NODE_ENV === "development") {
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );
  } else {
    app.use(helmet());
  }
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Arena REST API routes
  await registerArenaRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
