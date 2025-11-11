import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import nunjucks from "nunjucks";
import { getActiveEnv } from "../env/store";

type Mapping = { recipient: string; name: string; subject?: string };
type Row = Record<string, string>;
type Payload = {
  rows: Row[];
  mapping: Mapping;
  template: string;
  subjectTemplate?: string;
  dryRun?: boolean;
  attachmentsByName?: Record<string, Array<{ filename: string; contentBase64: string; contentType?: string }>>;
};
type Success = { to: string; messageId?: string; subject?: string; previewLength?: number; attachedCount?: number };
type Failure = { to?: string; row?: Row; subject?: string; error: string; attemptedAttachments?: number };

// Expect JSON body: { rows: Array<Record<string,string>>, mapping: { recipient: string, name: string, subject?: string }, template: string, subjectTemplate?: string, dryRun?: boolean }

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows, mapping, template, subjectTemplate, dryRun, attachmentsByName } = (payload || {}) as Payload;
  if (!rows || !Array.isArray(rows) || !mapping || !template) {
    return NextResponse.json({ ok: false, error: "Missing required fields (rows, mapping, template)" }, { status: 400 });
  }

  const override = getActiveEnv();
  const SENDER_EMAIL = override.SENDER_EMAIL || process.env.SENDER_EMAIL;
  const SENDER_APP_PASSWORD = override.SENDER_APP_PASSWORD || process.env.SENDER_APP_PASSWORD;
  const SENDER_NAME = override.SENDER_NAME || process.env.SENDER_NAME || SENDER_EMAIL;

  if (!SENDER_EMAIL || !SENDER_APP_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Sender env vars missing" }, { status: 500 });
  }

  // Configure transporter (Gmail example via app password)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SENDER_EMAIL,
      pass: SENDER_APP_PASSWORD,
    },
  });

  const successes: Success[] = [];
  const failures: Failure[] = [];

  const normalize = (s: string) => s.trim().toLowerCase();

  for (const r of rows) {
    const to = r[mapping.recipient];
    if (!to) continue;
    const ctx: Record<string, unknown> = { ...r, name: r[mapping.name], recipient: r[mapping.recipient] };
    let html: string;
    let subject: string | undefined;
    try {
      html = nunjucks.renderString(template, ctx);
    } catch (e: unknown) {
      failures.push({ row: r, error: `Template render failed: ${(e as Error).message}` });
      continue;
    }
    try {
      if (subjectTemplate) {
        subject = nunjucks.renderString(subjectTemplate, ctx);
      } else if (mapping.subject && r[mapping.subject]) {
        subject = String(r[mapping.subject]);
      } else {
        subject = "";
      }
    } catch {
      subject = "";
    }

    const nameRaw = r[mapping.name] || "";
    const nameKey = normalize(String(nameRaw));
    const atts = attachmentsByName && nameKey ? (attachmentsByName[nameKey] || []) : [];

    if (dryRun) {
      successes.push({ to, subject, previewLength: html.length, attachedCount: atts.length });
      continue;
    }

    try {
      const info = await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to,
        subject: subject || "",
        html,
        attachments: atts.map(a => ({ filename: a.filename, content: a.contentBase64, encoding: "base64", contentType: a.contentType })),
      });
      successes.push({ to, messageId: info.messageId, subject, attachedCount: atts.length });
    } catch (e: unknown) {
      failures.push({ to, subject, error: (e as Error).message, attemptedAttachments: atts.length });
    }
  }

  return NextResponse.json({ ok: failures.length === 0, sent: successes.length, failed: failures.length, successes, failures });
}
