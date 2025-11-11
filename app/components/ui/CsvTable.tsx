"use client";

import { useMemo, useState } from "react";
import type { ParsedCsv, CsvMapping } from "./CsvUploader";

type Props = {
  csv: ParsedCsv | null;
  mapping?: CsvMapping | null;
  onMappingChange?: (m: CsvMapping | null) => void;
  onChange?: (csv: ParsedCsv | null) => void;
};

export default function CsvTable({ csv, mapping, onMappingChange, onChange }: Props) {
  const [limit, setLimit] = useState<number>(100);
  const [q, setQ] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{ row: number; header: string } | null>(null);
  const [newHeader, setNewHeader] = useState<string>("");
  const [showAddCol, setShowAddCol] = useState<boolean>(false);

  const rows = useMemo(() => {
    if (!csv) return [] as Array<Record<string, string>>;
    const all = csv.rows as Array<Record<string, string>>;
    if (!q) return all.slice(0, limit);
    const lower = q.toLowerCase();
    const filtered = all.filter((r) =>
      csv.headers.some((h) => String(r[h] ?? "").toLowerCase().includes(lower))
    );
    return filtered.slice(0, limit);
  }, [csv, q, limit]);

  if (!csv) return <div className="text-sm opacity-80">No CSV loaded.</div>;

  const commitCell = (rowIndex: number, header: string, value: string) => {
    const updatedRows = [...csv.rows];
    const target = { ...(updatedRows[rowIndex] as Record<string, string>) };
    target[header] = value;
    updatedRows[rowIndex] = target;
    const updatedCsv: ParsedCsv = { ...csv, rows: updatedRows };
    onChange?.(updatedCsv);
    setEditingCell(null);
  };

  const deleteColumn = (header: string) => {
    const newHeaders = csv.headers.filter((h) => h !== header);
    const newRows = csv.rows.map((r) => {
      const copy = { ...(r as Record<string, string>) };
      delete copy[header];
      return copy;
    });
    const updated: ParsedCsv = { ...csv, headers: newHeaders, rows: newRows };
    onChange?.(updated);
    // Clear mapping if affected
    if (mapping && (mapping.recipient === header || mapping.name === header || mapping.subject === header)) {
      onMappingChange?.({
        recipient: mapping.recipient === header ? "" : mapping.recipient,
        name: mapping.name === header ? "" : mapping.name,
        subject: mapping.subject === header ? null : mapping.subject,
      });
    }
  };

  const addColumn = () => {
    const headerName = newHeader.trim();
    if (!headerName || csv.headers.includes(headerName)) return;
    const newHeaders = [...csv.headers, headerName];
    const newRows = csv.rows.map((r) => ({ ...(r as Record<string, string>), [headerName]: "" }));
    const updated: ParsedCsv = { ...csv, headers: newHeaders, rows: newRows };
    onChange?.(updated);
    setNewHeader("");
    setShowAddCol(false);
  };

  const downloadCsv = () => {
    const headerLine = csv.headers.join(",");
    const lines = csv.rows.map((r) => csv.headers.map((h) => {
      const v = (r as Record<string, string>)[h] ?? "";
      const escaped = '"' + String(v).replace(/"/g, '""') + '"';
      return escaped;
    }).join(","));
    const content = [headerLine, ...lines].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batchmail-modified.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="opacity-70">Rows: {csv.rowCount}</div>
        <label className="inline-flex items-center gap-2">
          <span className="opacity-70">Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="Filter..."
          />
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="opacity-70">Show</span>
          <select
            className="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[50, 100, 200, 500].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setShowAddCol((v) => !v)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          {showAddCol ? "Cancel" : "Add Column"}
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          Download CSV
        </button>
      </div>

      {showAddCol && (
        <div className="flex items-center gap-3 text-sm">
          <input
            value={newHeader}
            onChange={(e) => setNewHeader(e.target.value)}
            placeholder="New column name"
            className="w-52 rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <button
            type="button"
            onClick={addColumn}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      )}

      <div className="overflow-auto max-h-[60vh] border rounded-md shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              {csv.headers.map((h) => (
                <th key={h} className="px-3 py-2 border text-left font-semibold bg-gray-50 min-w-[140px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" title={h}>{h}</span>
                    <button
                      type="button"
                      onClick={() => deleteColumn(h)}
                      className="text-[11px] px-1 py-0.5 rounded border bg-white hover:bg-gray-100"
                      aria-label={`Delete column ${h}`}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 border text-left font-semibold bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    const blank: Record<string, string> = {};
                    csv.headers.forEach((h) => (blank[h] = ""));
                    const updated: ParsedCsv = {
                      ...csv,
                      rows: [...csv.rows, blank],
                      rowCount: (csv.rowCount || 0) + 1,
                    };
                    onChange?.(updated);
                  }}
                  className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-100"
                >
                  + Row
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50 hover:bg-green-50/40">
                {csv.headers.map((h) => {
                  const isEditing = editingCell && editingCell.row === i && editingCell.header === h;
                  return (
                    <td
                      key={h}
                      className="px-3 py-1.5 border align-top max-w-[40ch] truncate cursor-pointer"
                      onDoubleClick={() => setEditingCell({ row: i, header: h })}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={row[h]}
                          onBlur={(e) => commitCell(i, h, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commitCell(i, h, (e.target as HTMLInputElement).value);
                            } else if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full bg-white border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                      ) : (
                        <span className="whitespace-pre-wrap break-words text-[13px] leading-snug">{row[h]}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 border align-top">
                  <button
                    type="button"
                    onClick={() => {
                      const indexInAll = (csv.rows as Array<Record<string, string>>).indexOf(row);
                      const updatedRows = [...csv.rows];
                      if (indexInAll >= 0) {
                        updatedRows.splice(indexInAll, 1);
                      } else {
                        // fallback: remove by shallow equality on values
                        const key = JSON.stringify(row);
                        const idx = (csv.rows as Array<Record<string, string>>).findIndex(r => JSON.stringify(r) === key);
                        if (idx >= 0) updatedRows.splice(idx, 1);
                      }
                      const updated: ParsedCsv = { ...csv, rows: updatedRows, rowCount: Math.max((csv.rowCount || 1) - 1, 0) };
                      onChange?.(updated);
                    }}
                    className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
