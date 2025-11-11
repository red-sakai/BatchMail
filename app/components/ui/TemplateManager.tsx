"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

type Mode = "upload" | "edit";

export default function TemplateManager({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("edit");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      onChange(text);
    };
    reader.onerror = () => setError("Failed to read template file");
    reader.readAsText(file);
  };

  const variables = useMemo(() => {
    const vars = new Set<string>();
    const re = /\{\{\s*([a-zA-Z_][\w\.]*)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value))) vars.add(m[1]);
    return Array.from(vars);
  }, [value]);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">2) Template</h2>
        <div className="inline-flex rounded border overflow-hidden">
          <button
            type="button"
            className={`px-3 py-1 text-sm ${mode === "edit" ? "bg-gray-100" : "bg-white"}`}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-sm ${mode === "upload" ? "bg-gray-100" : "bg-white"}`}
            onClick={() => setMode("upload")}
          >
            Upload
          </button>
        </div>
      </div>

      {mode === "upload" ? (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".html,text/html"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
            className="block text-sm"
          />
          {value && (
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                onChange("");
              }}
            >
              Clear
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs opacity-80">
            Use Jinja variables like <code>{"{{ name }}"}</code> or any CSV header, e.g., <code>{"{{ company }}"}</code>.
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            className="w-full rounded border p-2 font-mono text-sm bg-background"
            placeholder="Paste or write your HTML template here..."
          />
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-xs opacity-80">
        Detected variables: {variables.length > 0 ? variables.join(", ") : "(none)"}
      </div>
    </div>
  );
}
