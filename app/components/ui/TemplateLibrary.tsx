"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailEditor, { EmailEditorHandle } from "./EmailEditor";
import VariablePicker from "./VariablePicker";

type SavedTemplate = {
  id: string;
  name: string;
  html: string;
  updatedAt: number;
};

const LS_KEY = "batchmail.templates.v1";

function loadTemplates(fallback: SavedTemplate[]): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw) as SavedTemplate[];
    if (!Array.isArray(arr)) return fallback;
    return arr;
  } catch {
    return fallback;
  }
}

function saveTemplates(arr: SavedTemplate[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(4);
}

type Props = {
  availableVars?: string[];
  initialHtml: string;
  onUseTemplate: (t: { html: string }) => void;
};

export default function TemplateLibrary({ availableVars = [], initialHtml, onUseTemplate }: Props) {
  const seed: SavedTemplate[] = [
    { id: uuid(), name: "Untitled", html: initialHtml || "", updatedAt: 0 },
  ];
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => loadTemplates(seed));
  const [activeId, setActiveId] = useState<string>(() => (loadTemplates(seed)[0]?.id));
  const active = templates.find(t => t.id === activeId) || templates[0];
  const [rawMode, setRawMode] = useState(false);
  const editorRef = useRef<EmailEditorHandle | null>(null);
  const [applied, setApplied] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Persist on changes
  useEffect(() => { saveTemplates(templates); }, [templates]);

  const available = useMemo(() => Array.from(new Set(availableVars)), [availableVars]);

  const updateActive = (patch: Partial<SavedTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === active.id ? { ...t, ...patch, updatedAt: Date.now() } : t));
  };

  const addTemplate = () => {
    const t: SavedTemplate = { id: uuid(), name: "New template", html: "", updatedAt: Date.now() };
    setTemplates(prev => [t, ...prev]);
    setActiveId(t.id);
  };

  const saveAsNew = () => {
    const clone: SavedTemplate = { id: uuid(), name: `${active.name} (copy)`, html: active.html, updatedAt: Date.now() };
    setTemplates(prev => [clone, ...prev]);
    setActiveId(clone.id);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length === 0) {
        // Always keep at least one blank template
        const fallback: SavedTemplate = { id: uuid(), name: "Untitled", html: "", updatedAt: Date.now() };
        setActiveId(fallback.id);
        return [fallback];
      }
      // Reset active if we deleted current
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      {/* Sidebar */}
      <div className="lg:col-span-1 border rounded h-full">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-medium">Templates</div>
          <button className="w-6 h-6 rounded border text-sm leading-5" onClick={addTemplate}>+</button>
        </div>
        <div className="max-h-96 overflow-auto text-sm">
          {templates.map(t => (
            <div key={t.id} className={`group flex items-center justify-between gap-2 px-3 py-2 border-b ${t.id === active.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
              <button onClick={() => setActiveId(t.id)} className="flex-1 text-left">
                <div className="font-medium truncate">{t.name || 'Untitled'}</div>
                <div className="text-xs text-gray-500 truncate">HTML template</div>
              </button>
              {templates.length > 1 && (
                <button
                  type="button"
                  aria-label="Delete template"
                  onClick={() => deleteTemplate(t.id)}
                  className="opacity-60 group-hover:opacity-100 text-xs px-2 py-1 rounded border bg-white hover:bg-red-50 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        {applied && (
          <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm flex items-center justify-between">
            <span>Template applied. You can head to the <strong>Preview &amp; Export</strong> tab to review and send.</span>
            <button
              className="px-2 py-1 text-xs rounded border border-green-300 bg-white hover:bg-green-100"
              onClick={() => {
                const usp = new URLSearchParams(Array.from(searchParams.entries()));
                usp.set("tab", "preview");
                router.replace(`/?${usp.toString()}`);
              }}
            >
              Go to Preview
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-lg font-medium">Template Editor</div>
            <div className="text-xs text-gray-600">Autosave enabled</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50" onClick={() => setRawMode(v => !v)}>{rawMode ? 'WYSIWYG' : 'Edit HTML'}</button>
            <button onClick={saveAsNew} className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-50">Save as new Template</button>
            <button
              type="button"
              className="px-3 py-1 rounded border text-sm bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                onUseTemplate({ html: active.html });
                setApplied(true);
                window.setTimeout(() => setApplied(false), 4000);
              }}
            >
              Use this template
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Template Name</div>
          <input value={active.name} onChange={(e) => updateActive({ name: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" placeholder="Enter a name" />
        </div>

        {/* Upload HTML file */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Upload HTML Template</div>
          <label className="inline-flex items-center gap-2 px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50 cursor-pointer w-fit">
            <input type="file" accept=".html,.htm,.txt" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              updateActive({ html: text });
            }} />
            <span>Choose file…</span>
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center justify-between">
            <span>Email Message</span>
            <VariablePicker
              variables={available}
              label="Insert Variable"
              onInsert={(v) => { editorRef.current?.insertVariable(v); editorRef.current?.focus(); }}
            />
          </div>
          {!rawMode ? (
            <EmailEditor ref={editorRef} value={active.html} onChange={(html) => updateActive({ html })} />
          ) : (
            <textarea value={active.html} onChange={(e) => updateActive({ html: e.target.value })} rows={18} className="email-editor-surface w-full border rounded p-3 text-sm font-mono bg-white" />
          )}
          {/* Actions moved to header for visibility */}
        </div>
      </div>
    </div>
  );
}
