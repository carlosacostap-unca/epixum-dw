"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type PartialExamTextVariant = "question" | "option" | "detail";

interface PartialExamTextProps {
  text: string;
  variant?: PartialExamTextVariant;
}

const variantClassName: Record<PartialExamTextVariant, string> = {
  question: "min-w-0 space-y-3 text-xl font-bold leading-8 text-zinc-900 dark:text-zinc-100 sm:text-2xl",
  option: "min-w-0 space-y-2 text-current",
  detail: "min-w-0 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300",
};

const markdownComponents: Components = {
  p({ children }) {
    return <span className="block whitespace-pre-wrap">{children}</span>;
  },
  pre({ children }) {
    return (
      <span className="my-3 block max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-zinc-300 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-50 dark:border-zinc-700 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-zinc-50">
        {children}
      </span>
    );
  },
  code({ className, children }) {
    const isFencedCode = className?.startsWith("language-");

    return (
      <code
        className={
          isFencedCode
            ? "font-mono text-[0.95em]"
            : "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.92em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }
      >
        {children}
      </code>
    );
  },
  ul({ children }) {
    return <ul className="ml-5 list-disc space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="ml-5 list-decimal space-y-1">{children}</ol>;
  },
};

export default function PartialExamText({ text, variant = "detail" }: PartialExamTextProps) {
  return (
    <div className={variantClassName[variant]}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
