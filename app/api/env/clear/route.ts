import { NextResponse } from "next/server";
import { clearAllProfiles } from "../store";

export async function POST() {
  clearAllProfiles();
  return NextResponse.json({ ok: true });
}
