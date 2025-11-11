"use client";

import { useCallback, useMemo } from "react";
import type { ParsedCsv, CsvMapping } from "./CsvUploader";

export type AttachmentEntry = { filename: string; contentBase64: string; contentType?: string };
export type AttachIndex = Record<string, AttachmentEntry[]>; // key: normalized name (lowercase, trimmed)

type Props = {
  csv: ParsedCsv | null;
  mapping: CsvMapping | null;
  value: AttachIndex;
  onChange: (next: AttachIndex) => void;
};

export default function AttachmentsUploader({ csv, mapping, value, onChange }: Props) {

  const normalize = useCallback((s: string) => s.trim().toLowerCase(), []);
  const fileBaseName = useCallback((name: string) => {
    const idx = name.lastIndexOf('.');
    return idx > 0 ? name.slice(0, idx) : name;
  }, []);

  const rowsNameSet = useMemo(() => {
    if (!csv || !mapping) return new Set<string>();
    const s = new Set<string>();
    (csv.rows as Array<Record<string,string>>).forEach(r => s.add(normalize(String(r[mapping.name] || ''))));
    return s;
  }, [csv, mapping, normalize]);

  const computed = useMemo(() => {
    const files = Object.values(value).reduce((acc, arr) => acc + arr.length, 0);
    let matched = 0; const unmatched: string[] = [];
    for (const [key, arr] of Object.entries(value)) {
      if (rowsNameSet.has(key)) matched += arr.length; else unmatched.push(...arr.map(a => a.filename));
    }
    return { files, matched, unmatched: files - matched, unmatchedFiles: unmatched };
  }, [value, rowsNameSet]);

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const res = String(fr.result || '');
      const idx = res.indexOf('base64,');
      resolve(idx >= 0 ? res.slice(idx + 7) : res);
    };
    fr.onerror = () => reject(fr.error || new Error('read error'));
    fr.readAsDataURL(file);
  });

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: AttachIndex = { ...value };
    for (const f of Array.from(files)) {
      try {
        const contentBase64 = await fileToBase64(f);
        const key = normalize(fileBaseName(f.name));
        const entry: AttachmentEntry = { filename: f.name, contentBase64, contentType: f.type || undefined };
        next[key] = [...(next[key] || []), entry];
      } catch {
        // ignore failed file
      }
    }
    onChange(next);
  };

  const clearAll = () => onChange({});

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">2) Upload Attachments (optional)</h2>
          <p className="text-xs opacity-80">File base name must match the CSV <strong>Name</strong> column (case-insensitive). Multiple files per name are allowed.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-1 rounded border text-sm bg-white text-gray-900 hover:bg-gray-50 cursor-pointer">
            <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
            Choose files…
          </label>
          <button type="button" onClick={clearAll} disabled={computed.files === 0} className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50">Clear</button>
        </div>
      </div>

      <div className="text-xs flex flex-wrap gap-3">
        <span className="opacity-70">Summary:</span>
  <span><strong>Total:</strong> {computed.files}</span>
  <span className="text-green-700"><strong>Matched:</strong> {computed.matched}</span>
  <span className="text-red-700"><strong>Unmatched:</strong> {computed.unmatched}</span>
      </div>

      {computed.unmatchedFiles.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer">View unmatched files</summary>
          <ul className="list-disc pl-5 mt-1">
            {computed.unmatchedFiles.slice(0, 30).map((f, i) => (<li key={i}>{f}</li>))}
            {computed.unmatchedFiles.length > 30 && <li>…and {computed.unmatchedFiles.length - 30} more</li>}
          </ul>
        </details>
      )}
    </div>
  );
}
