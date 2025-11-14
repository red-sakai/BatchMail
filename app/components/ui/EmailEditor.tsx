"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import DOMPurify from "dompurify";

type Props = {
  value: string;
  onChange: (html: string) => void;
  // variables prop retained for potential future inline usage, but variable insertion
  // is now centralized in the parent (PreviewPane) to avoid toolbar overflow.
  variables?: string[];
};

const sanitize = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

export type EmailEditorHandle = {
  insertVariable: (name: string) => void;
  focus: () => void;
};

function EmailEditorInner({ value, onChange }: Props, refForward: React.Ref<EmailEditorHandle>) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep the editor content in sync only when the external value changes.
  useEffect(() => {
    if (!ref.current) return;
    const clean = sanitize(value);
    if (ref.current.innerHTML !== clean) {
      ref.current.innerHTML = clean;
    }
  }, [value]);

  const notify = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const clean = sanitize(html);
    // Don't force innerHTML here to avoid caret jumps; trust user typing.
    onChange(clean);
  };

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    notify();
  };

  const insertVariable = (name: string) => {
    const token = `{{ ${name} }}`;
    document.execCommand(
      "insertHTML",
      false,
      `<span data-var="${name}" style="background:#f3f4f6;border:1px dashed #9ca3af;padding:0 2px;border-radius:3px;">${token}</span>`
    );
    notify();
  };

  const focus = () => {
    ref.current?.focus();
  };

  useImperativeHandle(refForward, () => ({ insertVariable, focus }));

  return (
    <div className="space-y-2">
      {/* Formatting toolbar only; variable insertion controlled externally to prevent overflow */}
      <div className="flex gap-2 pb-1 overflow-x-auto max-w-full editor-toolbar">
        <div className="inline-flex items-center gap-1 flex-shrink-0">
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => exec("bold")}>Bold</button>
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => exec("italic")}>Italic</button>
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => exec("underline")}>Underline</button>
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => exec("insertUnorderedList")}>• List</button>
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => exec("insertOrderedList")}>1. List</button>
        </div>
      </div>

      <div
        ref={ref}
        className="email-editor-surface min-h-40 w-full border rounded p-3 bg-white text-sm"
        contentEditable
        suppressContentEditableWarning
        onInput={notify}
        onBlur={notify}
      />
    </div>
  );
}

const EmailEditor = forwardRef<EmailEditorHandle, Props>(EmailEditorInner);
export default EmailEditor;
