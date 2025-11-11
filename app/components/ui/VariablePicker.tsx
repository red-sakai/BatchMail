"use client";

import { useMemo, useState, useRef, useEffect } from "react";

type Props = {
  variables: string[];
  onInsert: (name: string) => void;
  label?: string;
};

export default function VariablePicker({ variables, onInsert, label = "Insert variable" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const set = Array.from(new Set(variables.filter(Boolean)));
    if (!q.trim()) return set;
    const qq = q.toLowerCase();
    return set.filter((v) => v.toLowerCase().includes(qq));
  }, [variables, q]);

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50"
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-56 rounded border bg-white shadow">
          <div className="p-2 border-b">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search variables"
              className="w-full border rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-2 text-xs opacity-70">No matches</div>
            ) : (
              <ul className="text-sm">
                {filtered.map((v) => (
                  <li key={v}>
                    <button
                      type="button"
                      onClick={() => { onInsert(v); setOpen(false); setQ(""); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      {`{{ ${v} }}`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
