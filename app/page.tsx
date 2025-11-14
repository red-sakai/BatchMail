"use client";

import { useMemo, useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CsvUploader, { CsvMapping, ParsedCsv } from "./components/ui/CsvUploader";
// Legacy TemplateManager import removed; using TemplateLibrary instead.
import TemplateLibrary from "./components/ui/TemplateLibrary";
import PreviewPane from "./components/ui/PreviewPane";
import CsvTable from "./components/ui/CsvTable";
import AttachmentsUploader, { type AttachIndex } from "./components/ui/AttachmentsUploader";
import Tabs from "./components/ui/Tabs";
import Docs from "./components/sections/Docs";

type RenderedEmail = {
  to: string;
  name?: string;
  subject?: string;
  html: string;
};

function PageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [template, setTemplate] = useState<string>("<html>\n  <body>\n    <p>Hello {{ name }},</p>\n    <p>This is a sample template. Replace me!</p>\n  </body>\n</html>");
  const [subjectTemplate, setSubjectTemplate] = useState<string>("{{ subject }}");
  const [attachmentsByName, setAttachmentsByName] = useState<AttachIndex>({});
  const [hasSelectedTemplate, setHasSelectedTemplate] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);


  // Keep a derived indicator but avoid unused variable warnings.
  const totalCount = useMemo(() => (csv?.rowCount ?? 0), [csv]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('batchmail_dark');
      const enabled = saved ? saved === '1' : false;
      setDarkMode(enabled);
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (enabled) root.classList.add('dark'); else root.classList.remove('dark');
      }
    } catch {}
  }, []);

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      try { localStorage.setItem('batchmail_dark', next ? '1' : '0'); } catch {}
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (next) root.classList.add('dark'); else root.classList.remove('dark');
      }
      return next;
    });
  };

  const onExportJson = async (htmlRender: (row: Record<string, string>) => string) => {
    if (!csv || !mapping) return;
    const nunjucks = await import("nunjucks");
    const payload: RenderedEmail[] = csv.rows
      .filter((r: Record<string, string>) => r[mapping.recipient])
      .map((r: Record<string, string>) => ({
        to: String(r[mapping.recipient]),
        name: r[mapping.name] ? String(r[mapping.name]) : undefined,
        subject: subjectTemplate?.trim()
          ? nunjucks.renderString(subjectTemplate, { ...r, name: r[mapping.name], recipient: r[mapping.recipient] })
          : (mapping.subject ? String(r[mapping.subject]) : undefined),
        html: htmlRender(r),
      }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batchmail-payload.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Global dark/light toggle at top-right */}
      <button
        type="button"
        onClick={toggleDark}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`fixed top-4 right-4 z-50 rounded-full border p-2 shadow-sm transition ${darkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'}`}
        title={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? (
          // Moon icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M21.752 15.002A9 9 0 0 1 9 2.248a.75.75 0 0 0-.9-.9 10.5 10.5 0 1 0 12.552 12.552.75.75 0 0 0-.9-.898Z" />
          </svg>
        ) : (
          // Sun icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
            <path d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm0 15.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75Zm9-6a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM5.25 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM18.196 5.804a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM7.924 16.076a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 0 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM5.804 5.804a.75.75 0 0 1 1.06 0l1.061 1.06A.75.75 0 0 1 6.864 7.925L5.804 6.864a.75.75 0 0 1 0-1.06Zm10.272 10.272a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.061 1.061l-1.06-1.061a.75.75 0 0 1 0-1.06Z" />
          </svg>
        )}
      </button>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">BatchMail <span className="keep-light-pill text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Beta Test</span></h1>
        <p className="text-sm text-gray-800">Upload CSV, edit/upload Jinja-style HTML template, preview, and export. {totalCount ? `(${totalCount} rows)` : ""}</p>
      </header>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <Tabs
          items={[
            {
              id: "csv",
              label: "CSV",
              content: (
                <div className="space-y-4">
                  <CsvUploader
                    onParsed={(data: { csv: ParsedCsv; mapping: CsvMapping }) => {
                      setCsv(data.csv);
                      setMapping(data.mapping);
                      // Reset template selection on new CSV to reduce mistakes
                      setHasSelectedTemplate(false);
                    }}
                    currentMapping={mapping ?? undefined}
                  />
                  <AttachmentsUploader
                    csv={csv}
                    mapping={mapping}
                    value={attachmentsByName}
                    onChange={setAttachmentsByName}
                  />
                  <CsvTable
                    csv={csv}
                    mapping={mapping}
                    onMappingChange={setMapping}
                    onChange={setCsv}
                  />
                </div>
              ),
            },
            {
              id: "template",
              label: "Template",
              content: (
                <TemplateLibrary
                  availableVars={useMemo(() => {
                    const s = new Set<string>();
                    if (csv?.headers) csv.headers.forEach(h => s.add(h));
                    if (mapping) { s.add("name"); s.add("recipient"); }
                    return Array.from(s);
                  }, [csv, mapping])}
                  initialHtml={template}
                  onUseTemplate={({ html }) => { setTemplate(html); setHasSelectedTemplate(true); }}
                />
              ),
            },
            {
              id: "preview",
              label: "Preview & Export",
              content: (
                <PreviewPane
                  csv={csv}
                  mapping={mapping}
                  template={template}
                  onExportJson={onExportJson}
                  subjectTemplate={subjectTemplate}
                  onSubjectChange={setSubjectTemplate}
                  attachmentsByName={attachmentsByName}
                />
              ),
            },
            {
              id: "docs",
              label: "Documentation",
              content: (
                <div className="space-y-4">
                  <Docs />
                </div>
              ),
            },
          ]}
          initialId={(searchParams.get("tab") as string) || "csv"}
          isDisabled={(id) => {
            if (id === 'template') {
              return !csv; // block if no CSV uploaded yet
            }
            if (id === 'preview') {
              // require CSV+mapping and explicit template selection via "Use this template"
              return !csv || !mapping || !hasSelectedTemplate;
            }
            return false;
          }}
          getDisabledTitle={(id) => {
            if (id === 'template' && !csv) return 'Upload a CSV first to configure the template.';
            if (id === 'preview' && (!csv || !mapping)) return 'Upload CSV and set column mapping first.';
            if (id === 'preview' && !hasSelectedTemplate) return 'Choose a template and click "Use this template" first.';
            return undefined;
          }}
          onChange={(id) => {
            const usp = new URLSearchParams(Array.from(searchParams.entries()));
            usp.set("tab", id);
            router.replace(`/?${usp.toString()}`);
          }}
        />
      </div>
    </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PageInner />
    </Suspense>
  );
}
