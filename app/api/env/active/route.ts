import { NextResponse } from "next/server";
import { setActiveProfile } from "../store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = typeof body.profile === 'string' ? body.profile : null;
    setActiveProfile(profile && profile.trim() ? profile : null);
    return NextResponse.json({ ok: true, active: profile || null });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
