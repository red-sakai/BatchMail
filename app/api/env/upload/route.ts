import { NextResponse } from "next/server";
import { setProfile } from "../store";

const KEYS = ["SENDER_EMAIL", "SENDER_APP_PASSWORD", "SENDER_NAME"] as const;

function parseEnv(text: string): Record<string,string> {
  const out: Record<string,string> = {};
  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) out[key] = val;
  });
  return out;
}

export async function POST(req: Request) {
  // Accept multipart with a file OR raw text JSON: { envText: string }
  let envText = '';
  let profileName = '';
  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      const prof = formData.get('profile');
      if (typeof prof === 'string') profileName = prof;
      if (file instanceof File) {
        envText = await file.text();
        if (!profileName) {
          const fname = (file as File).name || '';
          const dot = fname.lastIndexOf('.');
          profileName = dot > 0 ? fname.slice(0, dot) : fname || 'custom';
        }
      }
    } else {
      const body = await req.json();
      envText = body.envText || '';
      if (typeof body.profile === 'string') profileName = body.profile;
      if (!profileName) profileName = 'custom';
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid upload body' }, { status: 400 });
  }
  if (!envText.trim()) {
    return NextResponse.json({ ok: false, error: 'No env content provided' }, { status: 400 });
  }
  const parsed = parseEnv(envText);
  const extracted: Record<string,string> = {};
  KEYS.forEach(k => { if (parsed[k]) extracted[k] = parsed[k]; });
  setProfile(profileName, extracted);
  const missing = KEYS.filter(k => !extracted[k]);
  return NextResponse.json({ ok: missing.length === 0, stored: extracted, missing, profile: profileName });
}
