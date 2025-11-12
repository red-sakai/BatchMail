"use client";

import { useMemo, useState, Suspense } from "react";
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


  // Keep a derived indicator but avoid unused variable warnings.
  const totalCount = useMemo(() => (csv?.rowCount ?? 0), [csv]);

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
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
  <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">BatchMail <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Beta Test</span></h1>
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
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PageInner />
    </Suspense>
  );
}
