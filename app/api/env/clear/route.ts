import { NextResponse } from "next/server";
import { clearOverrideEnv } from "../store";

export async function POST() {
  clearOverrideEnv();
  return NextResponse.json({ ok: true });
}
