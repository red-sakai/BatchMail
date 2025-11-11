import { NextResponse } from "next/server";
import { setSystemVariant } from "../store";

const ALLOWED = new Set(['default','icpep','cisco']);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const variant = typeof body.variant === 'string' ? body.variant.toLowerCase() : 'default';
    if (!ALLOWED.has(variant)) {
      return NextResponse.json({ ok:false, error:'Invalid variant' }, { status:400 });
    }
  setSystemVariant(variant as 'default' | 'icpep' | 'cisco');
    return NextResponse.json({ ok:true, variant });
  } catch {
    return NextResponse.json({ ok:false, error:'Invalid body' }, { status:400 });
  }
}
