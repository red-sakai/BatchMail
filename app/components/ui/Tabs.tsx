"use client";

import { useState, useEffect, ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

type Props = {
  items: TabItem[];
  initialId?: string;
  onChange?: (id: string) => void;
  // Optional: determine if a tab is disabled
  isDisabled?: (id: string) => boolean;
  // Optional: tooltip/title for disabled tabs
  getDisabledTitle?: (id: string) => string | undefined;
};

export default function Tabs({ items, initialId, onChange, isDisabled, getDisabledTitle }: Props) {
  const fallbackFirst = () => {
    const firstEnabled = items.find(it => !(isDisabled?.(it.id) ?? false));
    return firstEnabled?.id || items[0]?.id;
  };
  const [active, setActive] = useState<string>(initialId || fallbackFirst());
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize once from initialId if provided and active not set
    if (initialId && !active) {
      const disabled = isDisabled?.(initialId) ?? false;
      setActive(disabled ? fallbackFirst() : initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activate = (id: string) => {
    if (isDisabled?.(id)) {
      const msg = getDisabledTitle?.(id) || "This tab is currently disabled";
      setBlockedMsg(msg);
      // auto-clear after a few seconds
      setTimeout(() => setBlockedMsg(current => (current === msg ? null : current)), 4000);
      return;
    }
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className="w-full">
      <div role="tablist" aria-label="Main sections" className="flex flex-wrap gap-2 mb-4">
        {items.map((t) => {
          const selected = t.id === active;
          const disabled = isDisabled?.(t.id) ?? false;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => activate(t.id)}
                aria-disabled={disabled}
                title={disabled ? (getDisabledTitle?.(t.id) || 'This tab is currently disabled') : undefined}
                className={`px-4 py-2 rounded-md text-sm font-medium transition shadow-sm border ${selected ? "bg-gray-900 border-gray-900 text-white" : "bg-white hover:bg-gray-50 border-gray-200 text-gray-800"} ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''}`}
              >
                {t.label}
              </button>
            );
        })}
      </div>
      {blockedMsg && (
        <div role="status" className="mb-3 text-xs px-3 py-2 rounded border bg-yellow-50 border-yellow-200 text-yellow-900">
          {blockedMsg}
        </div>
      )}
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={t.id}
          hidden={t.id !== active}
          className="focus:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
