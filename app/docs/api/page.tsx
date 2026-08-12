import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export const metadata: Metadata = {
  title: "API Reference | rhex",
  description:
    "RHEX Trade-In API reference documentation for partner integration.",
};

export default function ApiDocsPage() {
  const mdPath = path.join(process.cwd(), "docs", "API-REFERENCE.md");
  const markdown = fs.readFileSync(mdPath, "utf-8");

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-12 border-t pt-8 text-xl font-semibold first:mt-0 first:border-t-0 first:pt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 text-lg font-semibold">{children}</h3>
    ),
    p: ({ children }) => <p className="mt-3 leading-relaxed">{children}</p>,
    ul: ({ children }) => (
      <ul className="mt-3 list-disc space-y-1 pl-6">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-3 list-decimal space-y-1 pl-6">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:text-primary/80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    hr: () => <hr className="my-8 border-border" />,
    code: ({ children, className }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className="block text-sm">{children}</code>
        );
      }
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-zinc-100 dark:bg-zinc-800">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b bg-muted/50">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border-t px-3 py-2">{children}</td>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-3 border-l-4 border-muted pl-4 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20">
      <div className="flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-rhex.svg"
            alt="rhex"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="text-xl font-bold tracking-tight">rhex</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="text-sm leading-relaxed text-foreground/90">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
