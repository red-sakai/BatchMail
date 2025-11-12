"use client";

import nunjucks from "nunjucks";
import Image from "next/image";
import { useCallback, useMemo, useEffect, useState } from "react";
import type { CsvMapping, ParsedCsv } from "./CsvUploader";
// email editing is performed in the Template tab
import type { AttachIndex } from "./AttachmentsUploader";


type Props = {
  csv: ParsedCsv | null;
  mapping: CsvMapping | null;
  template: string;
  onExportJson: (render: (row: Record<string, string>) => string) => void;
  subjectTemplate?: string;
  onSubjectChange?: (next: string) => void;
  attachmentsByName?: AttachIndex;
};

export default function PreviewPane({ csv, mapping, template, onExportJson, subjectTemplate = "", onSubjectChange, attachmentsByName }: Props) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendModalLogs, setSendModalLogs] = useState<Array<{ to:string; status:string; subject?: string; error?: string; messageId?: string; attachments?: number; timestamp?: string }>>([]);
  const [sendModalSummary, setSendModalSummary] = useState<{ sent:number; failed:number }>({ sent: 0, failed: 0 });
  const [sendModalTotal, setSendModalTotal] = useState<number | null>(null);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [batchAssignments, setBatchAssignments] = useState<Array<{ batch:number; recipients:string[] }>>([]);
  const [isSending, setIsSending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // User-selectable batch size (3 or 4)
  const [batchSize, setBatchSize] = useState<number>(4);
  const ready = !!csv && !!mapping && !!template?.trim();
  const [envOk, setEnvOk] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [systemVariant, setSystemVariantState] = useState<'default'|'icpep'|'cisco'>('default');
  // Default (.env) variant supports optional one-off upload/paste overrides (not persistent profiles)
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [overrideApplied, setOverrideApplied] = useState(false);
  

  useEffect(() => {
    let mounted = true;
    fetch("/api/env").then(r => r.json()).then((d) => {
      if (!mounted) return;
      setEnvOk(!!d.ok);
      setMissing(Array.isArray(d.missing) ? d.missing : []);
      if (d.systemVariant === 'icpep' || d.systemVariant === 'cisco') setSystemVariantState(d.systemVariant); else setSystemVariantState('default');
    }).catch(() => {
      if (!mounted) return;
      setEnvOk(false);
      setMissing(["SENDER_EMAIL","SENDER_APP_PASSWORD","SENDER_NAME"]);
    });
    return () => { mounted = false };
  }, []);

  // Profiles removed from UI; using only system variant mapping.

  // Attachment handling removed from PreviewPane (now in CSV tab).

  // Cooldown timer: when cooldownSec > 0, tick down every second
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);


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

  // Preview batches (size = batchSize) so user can see grouping before sending
  const batchPreview = useMemo(() => {
    const list: Array<{ batch:number; recipients:string[] }> = [];
    if (!recipients || recipients.length === 0) return list;
    const SIZE = batchSize === 3 ? 3 : 4; // enforce only 3 or 4
    for (let i = 0; i < recipients.length; i += SIZE) {
      list.push({ batch: (i / SIZE) + 1, recipients: recipients.slice(i, i + SIZE) });
    }
    return list;
  }, [recipients, batchSize]);

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

  const variantLabel = useMemo(() => (
    systemVariant === 'icpep' ? 'ICPEP SE - PUP Manila' : systemVariant === 'cisco' ? 'CNCP - Cisco NetConnect PUP' : 'Default (.env)'
  ), [systemVariant]);

  const variantLogo = useMemo(() => (
    systemVariant === 'icpep' ? '/icpep-logo.jpg' : systemVariant === 'cisco' ? '/cisco-logo.jpg' : null
  ), [systemVariant]);

  const doSendEmails = useCallback(async () => {
    if (!ready || !csv || !mapping) return;
    const allRows = csv.rows.filter(r => r[mapping.recipient]);
    const total = allRows.length;
  const BATCH_SIZE = batchSize === 3 ? 3 : 4; // constrain
    setShowSendModal(true);
    setSendModalLogs([]);
    setSendModalSummary({ sent:0, failed:0 });
    setSendModalTotal(total);
    // Compute and expose batch groupings for UI
    const assignments: Array<{ batch:number; recipients:string[] }> = [];
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const recips = allRows.slice(i, i + BATCH_SIZE).map(r => String(r[mapping.recipient]));
      assignments.push({ batch: (i / BATCH_SIZE) + 1, recipients: recips });
    }
    setBatchAssignments(assignments);
    try {
      setIsSending(true);
      for (let start = 0; start < total; start += BATCH_SIZE) {
        setCurrentBatchIndex(start / BATCH_SIZE);
        const batch = allRows.slice(start, start + BATCH_SIZE);
        const body = {
          rows: batch,
          mapping,
          template,
          subjectTemplate: subjectTemplate?.trim() || undefined,
          attachmentsByName,
          delayMs: 2000,
          jitterMs: 250,
        };
        const res = await fetch('/api/send/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          // mark whole batch as failed
          for (const r of batch) {
            const to = String(r[mapping.recipient] || '');
            setSendModalLogs(prev => [...prev, { to, status:'error', error: data?.error || 'Batch failed', attachments: 0, timestamp: new Date().toISOString() }]);
          }
          setSendModalSummary(prev => ({ sent: prev.sent, failed: prev.failed + batch.length }));
          continue;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'start') {
                // keep total as overall; only set if not yet set
                setSendModalTotal(prev => (prev == null ? (typeof obj.total === 'number' ? obj.total : null) : prev));
              } else if (obj.type === 'item') {
                setSendModalLogs(prev => [...prev, { to: obj.to, status: obj.status, subject: obj.subject, error: obj.error, messageId: obj.messageId, attachments: obj.attachments, timestamp: obj.timestamp }]);
                setSendModalSummary(prev => ({ sent: obj.status === 'sent' ? prev.sent + 1 : prev.sent, failed: obj.status === 'error' ? prev.failed + 1 : prev.failed }));
              } else if (obj.type === 'done') {
                // no-op; counts already tracked
              }
            } catch {}
          }
        }
        // small pause between batches
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      alert(`Send error: ${(e as Error).message}`);
    } finally {
      setIsSending(false);
      setCooldownSec(5);
    }
  }, [ready, csv, mapping, template, subjectTemplate, attachmentsByName, batchSize]);

  // Upload local .env to override default credentials (only allowed in default variant)
  const uploadEnvFile = async (file: File) => {
    if (systemVariant !== 'default') return; // safety
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await fetch('/api/env/upload', { method: 'POST', body: fd });
      const data = await res.json();
      const chk = await fetch('/api/env');
      const d2 = await chk.json();
      setEnvOk(!!d2.ok);
      setMissing(Array.isArray(d2.missing) ? d2.missing : []);
      if (!res.ok || !data.ok) {
        alert(`.env upload processed but missing: ${data.missing?.join(', ') || 'unknown'}`);
      } else {
        setOverrideApplied(true);
      }
    } catch (e) {
      alert(`.env upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const submitPaste = async () => {
    if (systemVariant !== 'default') { setShowPaste(false); return; }
    if (!pasteValue.trim()) { setShowPaste(false); return; }
    setUploading(true);
    try {
      const res = await fetch('/api/env/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ envText: pasteValue }) });
      const data = await res.json();
      const chk = await fetch('/api/env');
      const d2 = await chk.json();
      setEnvOk(!!d2.ok);
      setMissing(Array.isArray(d2.missing) ? d2.missing : []);
      if (!res.ok || !data.ok) {
        alert(`Paste processed but missing: ${data.missing?.join(', ') || 'unknown'}`);
      } else {
        setOverrideApplied(true);
      }
    } catch (e) {
      alert(`Paste failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      setShowPaste(false);
      setPasteValue("");
    }
  };

  const clearOverride = async () => {
    if (systemVariant !== 'default') return;
    setUploading(true);
    try {
      await fetch('/api/env/clear', { method: 'POST' });
      const chk = await fetch('/api/env');
      const d2 = await chk.json();
      setEnvOk(!!d2.ok);
      setMissing(Array.isArray(d2.missing) ? d2.missing : []);
      setOverrideApplied(false);
    } catch (e) {
      alert(`Clear failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-medium">3) Preview & Export</h2>
        <div className="flex items-center gap-2">
          {/* Variable insertion moved to Template tab */}
          {envOk === true && (
            <span className="px-2 py-0.5 rounded border text-xs bg-green-50 border-green-200 text-green-800">Sender env OK</span>
          )}
          {envOk === false && (
            <span className="px-2 py-0.5 rounded border text-xs bg-red-50 border-red-200 text-red-800">Missing env: {missing.join(', ')}</span>
          )}
          <div className="flex items-center gap-2 text-xs">
            <label className="opacity-70">System env:</label>
            <select
              className="border rounded px-3 py-1 bg-white text-sm text-gray-900 hover:bg-gray-50 cursor-pointer h-8"
              value={systemVariant}
              onChange={async (e) => {
                const val = e.target.value as 'default'|'icpep'|'cisco';
                try {
                  await fetch('/api/env/variant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variant: val }) });
                } catch {}
                const chk = await fetch('/api/env');
                const d2 = await chk.json();
                setEnvOk(!!d2.ok);
                setMissing(Array.isArray(d2.missing) ? d2.missing : []);
                if (d2.systemVariant === 'icpep' || d2.systemVariant === 'cisco') setSystemVariantState(d2.systemVariant); else setSystemVariantState('default');
              }}
            >
              <option value="default">Default (.env)</option>
              <option value="icpep">ICPEP SE - PUP Manila</option>
              <option value="cisco">CNCP - Cisco NetConnect PUP</option>
            </select>
          </div>
          {/* Brand logo based on selection */}
          {(() => {
            // Decide brand from system variant
            const isIcpep = systemVariant === 'icpep';
            const isCisco = systemVariant === 'cisco';
            if (isIcpep) return <Image src="/icpep-logo.jpg" alt="ICPEP" width={80} height={32} className="h-8 w-auto rounded-sm border" />;
            if (isCisco) return <Image src="/cisco-logo.jpg" alt="Cisco" width={80} height={32} className="h-8 w-auto rounded-sm border" />;
            return null;
          })()}
          {systemVariant === 'default' && (
            <>
              <label className="px-3 py-1 rounded border text-sm bg-white text-gray-900 hover:bg-gray-50 cursor-pointer">
                <input type="file" accept=".env,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadEnvFile(f); }} />
                {uploading ? 'Uploading…' : (overrideApplied ? 'Re-upload .env' : 'Upload .env')}
              </label>
              <button type="button" onClick={() => setShowPaste(true)} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">Paste .env</button>
              {overrideApplied && (
                <button type="button" onClick={clearOverride} disabled={uploading} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50">Clear override</button>
              )}
            </>
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
            disabled={!ready || envOk === false || isSending || cooldownSec > 0}
            onClick={async () => {
              if (!ready || !csv || !mapping || isSending || cooldownSec > 0) return;
              try {
                if (systemVariant === 'icpep' || systemVariant === 'cisco') {
                  setShowConfirmModal(true);
                  return;
                }
                await doSendEmails();
              } catch (e) {
                alert(`Send error: ${(e as Error).message}`);
              } finally {
              }
            }}
            className={`px-3 py-1 rounded border text-sm ${ready && envOk !== false && !isSending && cooldownSec === 0 ? "bg-green-600 border-green-700 text-white hover:bg-green-700" : "opacity-50 cursor-not-allowed"} ${isSending ? 'cursor-wait' : ''}`}
          >
            {isSending ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Sending…
              </span>
            ) : cooldownSec > 0 ? (
              `Wait ${cooldownSec}s`
            ) : (
              'Send Emails'
            )}
          </button>
          {/* Stream Send button removed per user request */}
        </div>
      </div>

      {/* Attachments uploader moved to CSV tab */}

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

          {/* Editor removed from Preview; edit HTML in Template tab */}
        </div>
      </div>

      {/* Batches preview (always visible when recipients exist) */}
      {batchPreview.length > 0 && (
        <div className="border rounded p-3 bg-white space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <span>Batches (preview)</span>
            <span className="text-xs opacity-70">{batchPreview.length} total</span>
          </div>
          {/* Batch size selector */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="opacity-70">Batch size:</span>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="batchSize"
                  value={3}
                  checked={batchSize === 3}
                  onChange={() => setBatchSize(3)}
                  className="accent-gray-800"
                />
                <span>3</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="batchSize"
                  value={4}
                  checked={batchSize === 4}
                  onChange={() => setBatchSize(4)}
                  className="accent-gray-800"
                />
                <span>4</span>
              </label>
            </div>
            <div className="text-[11px] text-gray-600">
              {attachmentsByName && Object.values(attachmentsByName).some(arr => Array.isArray(arr) && arr.length > 0) ? (
                <span><strong>Tip:</strong> Attachments detected. Prefer <strong>3 per batch</strong> to stay under function time limits.</span>
              ) : (
                <span><strong>Tip:</strong> No attachments detected. You can use <strong>4 per batch</strong> for faster overall sending.</span>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-auto text-xs bg-gray-50 border rounded">
            <ul className="divide-y">
              {batchPreview.map((b) => (
                <li key={`batch-${b.batch}`} className="px-3 py-2">
                  <div className="font-medium">Batch {b.batch}</div>
                  <div className="text-gray-700 break-words">{b.recipients.join(', ')}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-[11px] text-gray-600">
            Sending is performed sequentially per batch with a jittered ~2s delay per email to reduce throttling and avoid serverless timeouts.
          </div>
        </div>
      )}
    </div>
    {showPaste && systemVariant === 'default' && (
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
    {/* Streaming progress UI removed */}
    {showSendModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-full max-w-3xl rounded shadow-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm font-medium">{isSending ? 'Sending… Live Log' : 'Send Summary'}</div>
            <button className="text-xs px-2 py-1 border rounded" onClick={() => setShowSendModal(false)}>Close</button>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs flex gap-4 items-center">
              <span><strong>Sent:</strong> {sendModalSummary.sent}</span>
              <span><strong>Failed:</strong> {sendModalSummary.failed}</span>
              {typeof sendModalTotal === 'number' && (
                <span><strong>Remaining:</strong> {Math.max(0, sendModalTotal - (sendModalSummary.sent + sendModalSummary.failed))}</span>
              )}
              {isSending && <span className="opacity-70 animate-pulse">In Progress…</span>}
            </div>
            {typeof sendModalTotal === 'number' && (
              <div className="w-full h-2 bg-gray-200 rounded">
                <div className="h-2 bg-green-600 rounded" style={{ width: `${Math.min(100, Math.floor(((sendModalSummary.sent + sendModalSummary.failed) / (sendModalTotal || 1)) * 100))}%` }} />
              </div>
            )}
            {/* Batch overview */}
            {batchAssignments.length > 0 && (
              <div className="border rounded p-2 bg-gray-50 text-xs">
                <div className="mb-1 font-medium">Batches</div>
                <div className="flex flex-col gap-1 max-h-32 overflow-auto">
                  {batchAssignments.map((b, idx) => (
                    <div key={idx} className={`flex gap-2 items-start ${idx === currentBatchIndex ? 'text-green-700' : ''}`}>
                      <span className="min-w-[60px] inline-block">Batch {b.batch}:</span>
                      <span className="flex-1 break-words">{b.recipients.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isSending && (
              <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                Sending is paced with a ~2 second delay per email to reduce the risk of provider throttling, rate limits, or spam detection. This helps keep delivery reliable when sending to many recipients.
              </div>
            )}
            <div className="max-h-72 overflow-auto border rounded text-xs font-mono bg-white">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1 border">Recipient</th>
                    <th className="text-left px-2 py-1 border">Status</th>
                    <th className="text-left px-2 py-1 border">Time</th>
                    <th className="text-left px-2 py-1 border">Subject</th>
                    <th className="text-left px-2 py-1 border">Attachments</th>
                    <th className="text-left px-2 py-1 border">Message / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {sendModalLogs.map((l, i) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="px-2 py-1 border whitespace-pre-wrap break-words">{l.to}</td>
                      <td className={`px-2 py-1 border ${l.status === 'sent' ? 'text-green-700' : 'text-red-700'}`}>{l.status}</td>
                      <td className="px-2 py-1 border whitespace-pre-wrap break-words">{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ''}</td>
                      <td className="px-2 py-1 border whitespace-pre-wrap break-words">{l.subject || ''}</td>
                      <td className="px-2 py-1 border">{typeof l.attachments === 'number' ? l.attachments : ''}</td>
                      <td className="px-2 py-1 border whitespace-pre-wrap break-words">{l.error || l.messageId || ''}</td>
                    </tr>
                  ))}
                  {isSending && sendModalLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-center text-gray-500">Starting…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}
    {showConfirmModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded shadow-lg w-full max-w-md p-5 space-y-4">
          <div className="flex items-center gap-3">
            {variantLogo && <Image src={variantLogo} alt={variantLabel} width={64} height={32} className="h-8 w-auto rounded border" />}
            <h3 className="text-sm font-medium">Confirm Send</h3>
          </div>
          <p className="text-sm">You are using <strong>{variantLabel}</strong> credentials to send these emails. Are you sure you want to proceed?</p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-50"
              disabled={isSending}
            >Cancel</button>
            <button
              onClick={async () => { setShowConfirmModal(false); await doSendEmails(); }}
              className="px-3 py-1 border rounded text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              disabled={isSending}
            >{isSending ? 'Sending…' : 'Yes, Send'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
