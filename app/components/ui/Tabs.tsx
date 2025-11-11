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
};

export default function Tabs({ items, initialId, onChange }: Props) {
  const [active, setActive] = useState<string>(initialId || items[0]?.id);

  useEffect(() => {
    // Only initialize once from initialId if provided and active not set
    if (initialId && !active) {
      setActive(initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activate = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className="w-full">
      <div role="tablist" aria-label="Main sections" className="flex flex-wrap gap-2 mb-4">
        {items.map((t) => {
          const selected = t.id === active;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => activate(t.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition shadow-sm border ${selected ? "bg-gray-900 border-gray-900 text-white" : "bg-white hover:bg-gray-50 border-gray-200 text-gray-800"}`}
              >
                {t.label}
              </button>
            );
        })}
      </div>
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
