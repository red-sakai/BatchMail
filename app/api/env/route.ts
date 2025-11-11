import { NextResponse } from "next/server";
import { getActiveEnv, getActiveProfileName, listProfiles, getSystemVariant } from "./store";

const REQUIRED = ["SENDER_EMAIL", "SENDER_APP_PASSWORD", "SENDER_NAME"] as const;

type RequiredKey = typeof REQUIRED[number];

export async function GET() {
  const override = getActiveEnv();
  const present: Record<RequiredKey, boolean> = {
    SENDER_EMAIL: !!(override.SENDER_EMAIL || process.env.SENDER_EMAIL),
    SENDER_APP_PASSWORD: !!(override.SENDER_APP_PASSWORD || process.env.SENDER_APP_PASSWORD),
    SENDER_NAME: !!(override.SENDER_NAME || process.env.SENDER_NAME),
  };
  const missing = REQUIRED.filter((k) => !present[k]);
  return NextResponse.json({
    ok: missing.length === 0,
    present,
    missing,
    source: Object.fromEntries(REQUIRED.map((k) => [k, override[k] ? "profile" : (process.env[k] ? "env" : "missing")])),
    activeProfile: getActiveProfileName(),
    profiles: listProfiles(),
    systemVariant: getSystemVariant(),
    hint: "Create a .env.local file in the project root with SENDER_EMAIL, SENDER_APP_PASSWORD (e.g. Gmail App Password), and SENDER_NAME. Restart the server after changes.",
    example: "SENDER_EMAIL=you@example.com\nSENDER_APP_PASSWORD=abcd abcd abcd abcd\nSENDER_NAME=Your Name",
  });
}
