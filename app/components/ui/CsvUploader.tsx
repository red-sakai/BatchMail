"use client";

import Papa from "papaparse";
import { useRef, useState, useCallback } from "react";

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
  const [fileName, setFileName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
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
  }, [mapping, onParsed]);

  const onChangeSelect = (key: keyof CsvMapping, value: string) => {
    if (!csv) return;
    const next = { ...(mapping || { recipient: "", name: "", subject: null }), [key]: value || null } as CsvMapping;
    setMapping(next);
    onParsed({ csv, mapping: next });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes("csv") || file.name.endsWith(".csv")) {
        handleFile(file);
      } else {
        setError("Only .csv files are supported.");
      }
    }
  }, [handleFile]);

  const onDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">1) Upload CSV</h2>
            <p className="text-sm opacity-80">Provide a CSV with a header row. Drag & drop or use the button.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              id="csv-file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="sr-only"
            />
            <label
              htmlFor="csv-file-input"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-green-600"
            >
              <span className="inline-block">{fileName || "Choose CSV"}</span>
            </label>
            {csv && (
              <button
                type="button"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  setCsv(null);
                  setMapping(null);
                  setError(null);
                  setFileName("");
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <div
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          className={`group relative rounded-md border border-dashed p-6 text-center transition-colors ${dragActive ? "border-green-500 bg-green-50" : "border-gray-300"}`}
        >
          <p className="text-sm">{dragActive ? "Release to upload CSV" : "Drag & drop CSV here or use the button above."}</p>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {csv && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Map Columns</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-sm flex flex-col gap-1">
              <span className="text-xs font-medium opacity-80">Recipient column</span>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600"
                value={mapping?.recipient || ""}
                onChange={(e) => onChangeSelect("recipient", e.target.value)}
              >
                {csv.headers.map((h) => (
                  <option value={h} key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span className="text-xs font-medium opacity-80">Name column</span>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600"
                value={mapping?.name || ""}
                onChange={(e) => onChangeSelect("name", e.target.value)}
              >
                {csv.headers.map((h) => (
                  <option value={h} key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span className="text-xs font-medium opacity-80">Subject column (optional)</span>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600"
                value={mapping?.subject || ""}
                onChange={(e) => onChangeSelect("subject", e.target.value)}
              >
                <option value="">— None —</option>
                {csv.headers.map((h) => (
                  <option value={h} key={h}>{h}</option>
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
