#!/usr/bin/env node
/**
 * Generates public/sw.js from scripts/sw.template.js by injecting
 * NEXT_PUBLIC_FIREBASE_* env vars. Run before build/dev so FCM
 * background messages work in the service worker.
 */
const fs = require("fs");
const path = require("path");

// Load .env.local first (Next.js convention), then .env
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

const templatePath = path.join(process.cwd(), "scripts", "sw.template.js");
const outputPath = path.join(process.cwd(), "public", "sw.js");

const replacements = {
  __NEXT_PUBLIC_FIREBASE_API_KEY__:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  __NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  __NEXT_PUBLIC_FIREBASE_PROJECT_ID__:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  __NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  __NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  __NEXT_PUBLIC_FIREBASE_APP_ID__:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let content = fs.readFileSync(templatePath, "utf8");
for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.split(placeholder).join(value);
}

fs.writeFileSync(outputPath, content, "utf8");
console.log("[generate-sw] Wrote public/sw.js");
