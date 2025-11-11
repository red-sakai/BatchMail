"use client";

import nunjucks from "nunjucks";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import type { CsvMapping, ParsedCsv } from "./CsvUploader";
import EmailEditor, { EmailEditorHandle } from "./EmailEditor";
import VariablePicker from "./VariablePicker";


type Props = {
  csv: ParsedCsv | null;
  mapping: CsvMapping | null;
  template: string;
  onExportJson: (render: (row: Record<string, string>) => string) => void;
  onSendEmails?: () => void;
  onTemplateChange?: (next: string) => void;
  subjectTemplate?: string;
  onSubjectChange?: (next: string) => void;
};

export default function PreviewPane({ csv, mapping, template, onExportJson, onSendEmails, onTemplateChange, subjectTemplate = "", onSubjectChange }: Props) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [logs, setLogs] = useState<Array<{ index:number; to:string; status:string; subject?: string; error?: string }>>([]);
  const editorRef = useRef<EmailEditorHandle | null>(null);
  const ready = !!csv && !!mapping && !!template?.trim();
  const [envOk, setEnvOk] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [sourceMap, setSourceMap] = useState<Record<string,string>>({});
  const [uploading, setUploading] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/env").then(r => r.json()).then((d) => {
      if (!mounted) return;
      setEnvOk(!!d.ok);
      setMissing(Array.isArray(d.missing) ? d.missing : []);
      setSourceMap(d.source || {});
    }).catch(() => {
      if (!mounted) return;
      setEnvOk(false);
      setMissing(["SENDER_EMAIL","SENDER_APP_PASSWORD","SENDER_NAME"]);
    });
    return () => { mounted = false };
  }, []);

  const uploadEnvFile = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await fetch('/api/env/upload', { method: 'POST', body: fd });
      const data = await res.json();
      // Re-check
      const chk = await fetch('/api/env');
      const d2 = await chk.json();
      setEnvOk(!!d2.ok);
      setMissing(Array.isArray(d2.missing) ? d2.missing : []);
      setSourceMap(d2.source || {});
      if (!res.ok || !data.ok) {
        alert(`.env upload processed but missing: ${data.missing?.join(', ') || 'unknown'}`);
      }
    } catch (e) {
      alert(`.env upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const submitPaste = async () => {
    if (!pasteValue.trim()) { setShowPaste(false); return; }
    setUploading(true);
    try {
      const res = await fetch('/api/env/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ envText: pasteValue }) });
      const data = await res.json();
      const chk = await fetch('/api/env');
      const d2 = await chk.json();
      setEnvOk(!!d2.ok);
      setMissing(Array.isArray(d2.missing) ? d2.missing : []);
      setSourceMap(d2.source || {});
      if (!res.ok || !data.ok) {
        alert(`Paste processed but missing: ${data.missing?.join(', ') || 'unknown'}`);
      }
    } catch (e) {
      alert(`Paste failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      setShowPaste(false);
      setPasteValue("");
    }
  };

  const clearUploaded = async () => {
    setUploading(true);
    try {
      await fetch('/api/env/clear', { method: 'POST' });
      const chk = await fetch('/api/env');
      const d2 = await chk.json();
      setEnvOk(!!d2.ok);
      setMissing(Array.isArray(d2.missing) ? d2.missing : []);
      setSourceMap(d2.source || {});
    } catch (e) {
      alert(`Clear failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const anyUploaded = Object.values(sourceMap).some(v => v === 'uploaded');

  const renderRow = useCallback(
    (row: Record<string, string>) => {
      if (!mapping) return template;
      // Build context with all CSV fields, and standard aliases name/recipient.
      const ctx: Record<string, unknown> = { ...row };
      ctx.name = row[mapping.name];
      ctx.recipient = row[mapping.recipient];
      try {
        // Render using nunjucks (Jinja compatible)
        return nunjucks.renderString(template, ctx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `<!-- Render error: ${msg} -->\n` + template;
      }
    },
    [mapping, template]
  );

  const recipients = useMemo(() => {
    if (!csv || !mapping) return [] as string[];
    return (csv.rows as Array<Record<string, string>>)
      .filter((r) => r[mapping.recipient])
      .map((r) => String(r[mapping.recipient]));
  }, [csv, mapping]);

  const availableVars = useMemo(() => {
    const s = new Set<string>();
    if (csv?.headers) csv.headers.forEach((h) => s.add(h));
    if (mapping) { s.add("name"); s.add("recipient"); }
    return Array.from(s);
  }, [csv, mapping]);

  const usedSubjectVars = useMemo(() => {
    const vars = new Set<string>();
    const re = /\{\{\s*([a-zA-Z_][\w\.]*)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(subjectTemplate || ""))) vars.add(m[1]);
    return Array.from(vars);
  }, [subjectTemplate]);

  const usedBodyVars = useMemo(() => {
    const vars = new Set<string>();
    const re = /\{\{\s*([a-zA-Z_][\w\.]*)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(template || ""))) vars.add(m[1]);
    return Array.from(vars);
  }, [template]);

  const allUsed = useMemo(() => Array.from(new Set([...usedSubjectVars, ...usedBodyVars])), [usedSubjectVars, usedBodyVars]);
  const invalidUsed = useMemo(() => allUsed.filter((v) => !availableVars.includes(v)), [allUsed, availableVars]);

  return (
    <>
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-medium">3) Preview & Export</h2>
        <div className="flex items-center gap-2">
          <VariablePicker
            variables={availableVars}
            label="Insert variable"
            onInsert={(v) => {
              const active = document.activeElement as HTMLElement | null;
              const token = `{{ ${v} }}`;
              if (active && active.tagName === 'INPUT') {
                const el = active as HTMLInputElement;
                const current = subjectTemplate || "";
                const start = el.selectionStart ?? current.length;
                const end = el.selectionEnd ?? start;
                const next = current.slice(0, start) + token + current.slice(end);
                onSubjectChange?.(next);
                setTimeout(() => {
                  try { el.focus(); el.setSelectionRange(start + token.length, start + token.length); } catch {}
                }, 0);
              } else {
                editorRef.current?.insertVariable(v);
                editorRef.current?.focus();
              }
            }}
          />
          {envOk === true && (
            <span className="px-2 py-0.5 rounded border text-xs bg-green-50 border-green-200 text-green-800">Sender env OK</span>
          )}
          {envOk === false && (
            <span className="px-2 py-0.5 rounded border text-xs bg-red-50 border-red-200 text-red-800">Missing env: {missing.join(', ')}</span>
          )}
          <label className="px-3 py-1 rounded border text-sm bg-white text-gray-900 hover:bg-gray-50 cursor-pointer">
            <input type="file" accept=".env,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadEnvFile(f); }} />
            {uploading ? 'Uploading…' : 'Upload .env'}
          </label>
          <button type="button" onClick={() => setShowPaste(true)} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">Paste .env</button>
          {anyUploaded && (
            <button type="button" onClick={clearUploaded} disabled={uploading} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50">Clear uploaded</button>
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={() => ready && onExportJson((row) => renderRow(row))}
            className={`px-3 py-1 rounded border text-sm ${ready ? "bg-gray-900 border-gray-900 text-white hover:bg-black" : "opacity-50 cursor-not-allowed"}`}
          >
            Export JSON
          </button>
          <button
            type="button"
            disabled={!ready || envOk === false}
            onClick={() => ready && onSendEmails?.()}
            className={`px-3 py-1 rounded border text-sm ${ready && envOk !== false ? "bg-green-600 border-green-700 text-white hover:bg-green-700" : "opacity-50 cursor-not-allowed"}`}
          >
            Send Emails
          </button>
          {ready && envOk && !sending && (
            <button
              type="button"
              onClick={async () => {
                if (!csv || !mapping) return;
                setSending(true);
                setProgress(null);
                setLogs([]);
                try {
                  const body = { rows: csv.rows, mapping, template, subjectTemplate };
                  const res = await fetch('/api/send/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                  if (!res.ok || !res.body) throw new Error('Stream failed');
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  let buffer = '';
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let idx: number;
                    while ((idx = buffer.indexOf('\n')) !== -1) {
                      const line = buffer.slice(0, idx).trim();
                      buffer = buffer.slice(idx + 1);
                      if (!line) continue;
                      try {
                        const evt = JSON.parse(line);
                        if (evt.type === 'start') {
                          setProgress({ total: evt.total, sent: 0, failed: 0 });
                        } else if (evt.type === 'item') {
                          setLogs(l => [...l, { index: evt.index, to: evt.to, status: evt.status, subject: evt.subject, error: evt.error }]);
                          setProgress(p => p ? { ...p, sent: evt.status === 'sent' ? p.sent + 1 : p.sent, failed: evt.status === 'error' ? p.failed + 1 : p.failed } : p);
                        } else if (evt.type === 'done') {
                          setProgress(p => p ? { ...p, sent: evt.sent, failed: evt.failed } : p);
                        }
                      } catch {}
                    }
                  }
                } catch (e) {
                  alert(`Streaming error: ${(e as Error).message}`);
                } finally {
                  setSending(false);
                }
              }}
              className="px-3 py-1 rounded border text-sm bg-blue-600 border-blue-700 text-white hover:bg-blue-700"
            >
              Stream Send
            </button>
          )}
        </div>
      </div>

      {!csv && <div className="text-sm opacity-80">Upload a CSV to see previews.</div>}
      {csv && !mapping && <div className="text-sm opacity-80">Set column mapping to preview emails.</div>}
      {csv && mapping && !template?.trim() && <div className="text-sm opacity-80">Provide an HTML template to preview.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 border rounded">
          <div className="px-3 py-2 text-sm bg-gray-50 border-b font-medium flex items-center justify-between">
            <span>Recipients</span>
            <span className="text-xs opacity-70">{recipients.length}</span>
          </div>
          <div className="max-h-80 overflow-auto text-xs">
            {recipients.length === 0 && (
              <div className="p-3 opacity-70">No recipients. Map a recipient column in the CSV tab.</div>
            )}
            <ul className="divide-y">
              {recipients.map((email, idx) => (
                <li key={`${email}-${idx}`} className="px-3 py-2">{email}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Subject</div>
            <div className="flex items-center gap-2">
              <input
                value={subjectTemplate}
                onChange={(e) => onSubjectChange?.(e.target.value)}
                placeholder="e.g. Hello {{ name }}"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
            </div>
            {allUsed.length > 0 && (
              <div className="text-xs flex flex-wrap gap-2">
                <span className="opacity-70">Variables used:</span>
                {allUsed.map((v) => (
                  <span key={v} className={`px-2 py-0.5 rounded border ${availableVars.includes(v) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {`{{ ${v} }}`}
                  </span>
                ))}
              </div>
            )}
            {invalidUsed.length > 0 && (
              <div className="text-xs text-red-700">Unknown variables: {invalidUsed.join(', ')} (not found in CSV headers)</div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Edit email (WYSIWYG)</div>
          <EmailEditor
              ref={editorRef}
            value={template}
            onChange={(html) => onTemplateChange?.(html)}
            variables={(() => {
              const s = new Set<string>();
              const re = /\{\{\s*([a-zA-Z_][\w\.]*)\s*\}\}/g;
              let m: RegExpExecArray | null;
              while ((m = re.exec(template))) s.add(m[1]);
              if (csv?.headers) csv.headers.forEach((h) => s.add(h));
              if (mapping) { s.add("name"); s.add("recipient"); }
              return Array.from(s);
            })()}
          />
          </div>
        </div>
      </div>
    </div>
    {showPaste && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Paste .env content</h3>
            <button onClick={() => setShowPaste(false)} className="text-xs px-2 py-1 border rounded">Close</button>
          </div>
          <textarea value={pasteValue} onChange={(e) => setPasteValue(e.target.value)} rows={8} className="w-full border rounded p-2 text-xs font-mono" placeholder="SENDER_EMAIL=you@example.com\nSENDER_APP_PASSWORD=app-password\nSENDER_NAME=Your Name" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPaste(false)} className="px-3 py-1 border rounded text-sm">Cancel</button>
            <button onClick={submitPaste} disabled={uploading} className="px-3 py-1 border rounded text-sm bg-green-600 text-white disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    )}
    {sending && progress && (
      <div className="mt-4 space-y-3">
        <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
          <div
            className="h-3 bg-green-600 transition-all"
            style={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
          />
        </div>
        <div className="text-xs flex gap-4">
          <span>Total: {progress.total}</span>
          <span>Sent: {progress.sent}</span>
          <span>Failed: {progress.failed}</span>
          <span>Remaining: {progress.total - (progress.sent + progress.failed)}</span>
        </div>
        <div className="max-h-48 overflow-auto border rounded text-xs font-mono bg-white">
          <ul className="divide-y">
            {logs.map(l => (
              <li key={l.index} className="px-2 py-1 flex gap-2">
                <span className="w-12 text-right">#{l.index}</span>
                <span className="flex-1 truncate">{l.to}</span>
                <span className={l.status === 'sent' ? 'text-green-700' : 'text-red-700'}>{l.status}</span>
                {l.error && <span className="text-red-500 truncate" title={l.error}>{l.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
    </>
  );
}
