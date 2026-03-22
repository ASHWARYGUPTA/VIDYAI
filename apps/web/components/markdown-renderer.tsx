"use client";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Mermaid ───────────────────────────────────────────────────────────────────

// Load mermaid via <script> tag so webpack never bundles it.
// The /public/mermaid.min.js IIFE sets window.mermaid on load.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _mermaid: any = null;
let _initPromise: Promise<void> | null = null;

function getMermaid(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.mermaid?.render) {
      _mermaid = win.mermaid;
      _mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "/mermaid.min.js";
    script.onload = () => {
      _mermaid = win.mermaid;
      if (!_mermaid?.render) { reject(new Error("mermaid not found")); return; }
      _mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
      resolve();
    };
    script.onerror = () => reject(new Error("failed to load mermaid script"));
    document.head.appendChild(script);
  });
  return _initPromise;
}

export function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    getMermaid()
      .then(() =>
        _mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, code)
      )
      .then(({ svg }: { svg: string }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [code]);

  if (error) return <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{code}</pre>;
  return (
    <div
      ref={ref}
      className="my-4 overflow-x-auto rounded-lg border bg-white p-4 dark:bg-slate-900"
    />
  );
}

// ── Obsidian-style callouts ───────────────────────────────────────────────────

function renderCallout(text: string) {
  const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*([\s\S]*)/i);
  if (!match) return null;
  const type = match[1].toUpperCase();
  const body = match[2].trim();
  const styles: Record<string, string> = {
    NOTE:      "bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
    TIP:       "bg-green-50 border-green-400 text-green-900 dark:bg-green-950/30 dark:text-green-200",
    IMPORTANT: "bg-purple-50 border-purple-400 text-purple-900 dark:bg-purple-950/30 dark:text-purple-200",
    WARNING:   "bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  };
  const icons: Record<string, string> = { NOTE: "ℹ️", TIP: "💡", IMPORTANT: "⚠️", WARNING: "🚨" };
  return (
    <div className={`border-l-4 rounded-r-md px-4 py-2 my-3 text-sm ${styles[type] ?? ""}`}>
      <span className="font-semibold mr-1">{icons[type]} {type}</span> {body}
    </div>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function NoteRenderer({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }) {
          const code = String(children).trim();
          if (className === "language-mermaid") return <MermaidBlock code={code} />;
          return <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
        },
        blockquote({ children }) {
          const text = (children as React.ReactNode[])
            ?.map((c: unknown) =>
              typeof c === "string" ? c : (c as { props?: { children?: string } })?.props?.children ?? ""
            )
            .join("");
          const callout = renderCallout(text);
          if (callout) return callout;
          return <blockquote className="border-l-4 pl-4 italic text-muted-foreground my-2">{children}</blockquote>;
        },
        h2({ children }) {
          return <h2 className="text-base font-semibold mt-5 mb-2 text-foreground border-b pb-1">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-sm font-semibold mt-4 mb-1 text-foreground">{children}</h3>;
        },
        ul({ children }) { return <ul className="list-disc pl-5 space-y-1 text-sm">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal pl-5 space-y-1 text-sm">{children}</ol>; },
        li({ children }) { return <li className="text-sm leading-relaxed">{children}</li>; },
        p({ children })  { return <p className="text-sm leading-relaxed mb-2">{children}</p>; },
        strong({ children }) {
          return <strong className="font-semibold text-foreground">{children}</strong>;
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs border-collapse border border-border">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return <th className="border border-border bg-muted px-3 py-1.5 text-left font-semibold">{children}</th>;
        },
        td({ children }) {
          return <td className="border border-border px-3 py-1.5">{children}</td>;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
