"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copiar",
  title,
  className = "",
}: {
  value: string;
  label?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-2)] ${className}`}
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}
