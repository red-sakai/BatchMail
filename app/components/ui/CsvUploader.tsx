"use client";

import Papa from "papaparse";
import { useRef, useState } from "react";

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
};

export type CsvMapping = {
  recipient: string; // column key for email address
  name: string; // column key for recipient name
  subject?: string | null; // optional column key for subject
};

type Props = {
  onParsed: (result: { csv: ParsedCsv; mapping: CsvMapping }) => void;
  currentMapping?: CsvMapping;
};

const guessRecipient = (headers: string[]) =>
  headers.find((h) => /^(email|e-mail|recipient|to|address)$/i.test(h)) || headers[0] || "";

const guessName = (headers: string[]) =>
  headers.find((h) => /^(name|full[_\s-]?name|first[_\s-]?name)$/i.test(h)) || headers[0] || "";

const guessSubject = (headers: string[]) =>
  headers.find((h) => /^(subject|title|headline|topic)$/i.test(h)) || null;

export default function CsvUploader({ onParsed, currentMapping }: Props) {
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(currentMapping ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const rows = (results.data || []).filter(Boolean) as Array<Record<string, string>>;
        const headers = (results.meta.fields || []).map((h) => String(h));
        if (headers.length === 0) {
          setError("No headers found. Ensure the first row contains column names.");
          return;
        }
        const parsed: ParsedCsv = { headers, rows, rowCount: rows.length };
        setCsv(parsed);
        const nextMapping: CsvMapping = {
          recipient: mapping?.recipient || guessRecipient(headers),
          name: mapping?.name || guessName(headers),
          subject: mapping?.subject ?? guessSubject(headers),
        };
        setMapping(nextMapping);
        onParsed({ csv: parsed, mapping: nextMapping });
      },
      error: (err: unknown) => {
        const msg = (typeof err === "object" && err && "message" in err)
          ? String((err as { message?: string }).message || "Failed to parse CSV")
          : "Failed to parse CSV";
        setError(msg);
      },
    });
  };

  const onChangeSelect = (key: keyof CsvMapping, value: string) => {
    if (!csv) return;
    const next = { ...(mapping || { recipient: "", name: "", subject: null }), [key]: value || null } as CsvMapping;
    setMapping(next);
    onParsed({ csv, mapping: next });
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">1) Upload CSV</h2>
          <p className="text-xs opacity-80">CSV with headers, including recipient and name columns.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="block text-sm"
          />
          {csv && (
            <button
              type="button"
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                setCsv(null);
                setMapping(null);
                setError(null);
              }}
              className="rounded border px-2 py-1 text-xs bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {csv && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="block text-xs opacity-80 mb-1">Recipient column</span>
              <select
                className="w-full rounded border px-2 py-1 text-sm bg-background border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={mapping?.recipient || ""}
                onChange={(e) => onChangeSelect("recipient", e.target.value)}
              >
                {csv.headers.map((h) => (
                  <option value={h} key={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-xs opacity-80 mb-1">Name column</span>
              <select
                className="w-full rounded border px-2 py-1 text-sm bg-background border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={mapping?.name || ""}
                onChange={(e) => onChangeSelect("name", e.target.value)}
              >
                {csv.headers.map((h) => (
                  <option value={h} key={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-xs opacity-80 mb-1">Subject column (optional)</span>
              <select
                className="w-full rounded border px-2 py-1 text-sm bg-background border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                value={mapping?.subject || ""}
                onChange={(e) => onChangeSelect("subject", e.target.value)}
              >
                <option value="">— None —</option>
                {csv.headers.map((h) => (
                  <option value={h} key={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="text-xs opacity-80">Rows parsed: {csv.rowCount}</div>
        </div>
      )}
    </div>
  );
}
