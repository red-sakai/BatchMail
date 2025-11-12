import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import nunjucks from "nunjucks";
import { getActiveEnv } from "../../env/store";

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
type Payload = {
  rows: Row[];
  mapping: Mapping;
  template: string;
  subjectTemplate?: string;
  // optional attachments keyed by normalized name
  attachmentsByName?: Record<string, Array<{ filename: string; contentBase64: string; contentType?: string }>>;
  // optional delay in ms between sends
  delayMs?: number;
  // optional jitter in ms applied around delay (+/- jitter)
  jitterMs?: number;
};

export async function POST(req: Request) {
  let payloadUnknown: unknown;
  try { payloadUnknown = await req.json(); } catch { return NextResponse.json({ ok:false, error:"Invalid JSON" }, { status:400 }); }
  const { rows, mapping, template, subjectTemplate, attachmentsByName, delayMs, jitterMs } = (payloadUnknown || {}) as Payload;
  if (!rows || !Array.isArray(rows) || !mapping || !template) {
    return NextResponse.json({ ok:false, error:"Missing required fields" }, { status:400 });
  }

  const override = getActiveEnv();
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
  const norm = (s: string) => String(s || "").trim().toLowerCase();
  const delay = typeof delayMs === 'number' && delayMs > 0 ? delayMs : 2000; // default 2s
  const jitter = typeof jitterMs === 'number' && jitterMs >= 0 ? Math.floor(jitterMs) : 250; // default 250ms

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (obj: unknown) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
      enqueue({ type:"start", total: filtered.length });
      for (const r of filtered) {
        const current = index++;
        const { body, subj } = renderTemplate(template, subjectTemplate, r, mapping);
        const nameKey = norm(r[mapping.name]);
        const atts = nameKey && attachmentsByName ? (attachmentsByName[nameKey] || []) : [];
        try {
          const info = await transporter.sendMail({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: r[mapping.recipient],
            subject: subj,
            html: body,
            attachments: atts.map(a => ({ filename: a.filename, content: a.contentBase64, encoding: 'base64', contentType: a.contentType })),
          });
          sent++;
          enqueue({ type:"item", index: current, to: r[mapping.recipient], status:"sent", messageId: info.messageId, subject: subj, attachments: atts.length, timestamp: new Date().toISOString() });
        } catch (e) {
          failed++;
          enqueue({ type:"item", index: current, to: r[mapping.recipient], status:"error", error: (e as Error).message, subject: subj, attachments: atts.length, timestamp: new Date().toISOString() });
        }
        // delay between sends to avoid overloading provider (skip after last)
        if (delay > 0 && index < filtered.length) {
          const jitterOffset = jitter > 0 ? Math.floor((Math.random() * 2 - 1) * jitter) : 0;
          const wait = Math.max(0, delay + jitterOffset);
          await new Promise(res => setTimeout(res, wait));
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
