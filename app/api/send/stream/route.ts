import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import nunjucks from "nunjucks";
import { getOverrideEnv } from "../../env/store";

// Streams NDJSON lines: {type:"start", total}, {type:"item", index, to, status, error?}, {type:"done", sent, failed}

export const runtime = "nodejs"; // ensure node runtime for streaming

function renderTemplate(html: string, subject: string | undefined, row: Record<string,string>, mapping: { recipient: string; name: string; subject?: string }) {
  const ctx: Record<string, unknown> = { ...row, name: row[mapping.name], recipient: row[mapping.recipient] };
  let body = html;
  let subj = subject;
  try { body = nunjucks.renderString(html, ctx); } catch {}
  if (subject) {
    try { subj = nunjucks.renderString(subject, ctx); } catch {}
  } else if (mapping.subject && row[mapping.subject]) {
    subj = String(row[mapping.subject]);
  }
  return { body, subj: subj || "" };
}

type Mapping = { recipient: string; name: string; subject?: string };
type Row = Record<string, string>;
type Payload = { rows: Row[]; mapping: Mapping; template: string; subjectTemplate?: string };

export async function POST(req: Request) {
  let payloadUnknown: unknown;
  try { payloadUnknown = await req.json(); } catch { return NextResponse.json({ ok:false, error:"Invalid JSON" }, { status:400 }); }
  const { rows, mapping, template, subjectTemplate } = (payloadUnknown || {}) as Payload;
  if (!rows || !Array.isArray(rows) || !mapping || !template) {
    return NextResponse.json({ ok:false, error:"Missing required fields" }, { status:400 });
  }

  const override = getOverrideEnv();
  const SENDER_EMAIL = override.SENDER_EMAIL || process.env.SENDER_EMAIL;
  const SENDER_APP_PASSWORD = override.SENDER_APP_PASSWORD || process.env.SENDER_APP_PASSWORD;
  const SENDER_NAME = override.SENDER_NAME || process.env.SENDER_NAME || SENDER_EMAIL;
  if (!SENDER_EMAIL || !SENDER_APP_PASSWORD) {
    return NextResponse.json({ ok:false, error:"Sender env vars missing" }, { status:500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SENDER_EMAIL, pass: SENDER_APP_PASSWORD },
  });

  const filtered = rows.filter((r: Record<string,string>) => r[mapping.recipient]);
  let index = 0;
  let sent = 0;
  let failed = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (obj: unknown) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
      enqueue({ type:"start", total: filtered.length });
      for (const r of filtered) {
        const current = index++;
        const { body, subj } = renderTemplate(template, subjectTemplate, r, mapping);
        try {
          const info = await transporter.sendMail({ from: `${SENDER_NAME} <${SENDER_EMAIL}>`, to: r[mapping.recipient], subject: subj, html: body });
          sent++;
          enqueue({ type:"item", index: current, to: r[mapping.recipient], status:"sent", messageId: info.messageId, subject: subj });
        } catch (e) {
          failed++;
          enqueue({ type:"item", index: current, to: r[mapping.recipient], status:"error", error: (e as Error).message, subject: subj });
        }
      }
      enqueue({ type:"done", sent, failed });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    }
  });
}
