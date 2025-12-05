"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownWithLatexProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown with LaTeX math support
 * 
 * Supports:
 * - Inline math: $...$
 * - Block math: $$...$$
 * - All standard markdown features
 */
export function MarkdownWithLatex({ content, className = "" }: MarkdownWithLatexProps) {
  return (
    <div className={`prose prose-sm max-w-none overflow-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
        // Customize rendering for better styling and overflow handling
        p: ({ children }) => <p className="mb-3 leading-relaxed break-words">{children}</p>,
        ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="mb-1 break-words">{children}</li>,
        code: ({ inline, children, ...props }: any) => {
          return inline ? (
            <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono break-all" {...props}>
              {children}
            </code>
          ) : (
            <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-3 max-w-full">
              <code className="text-sm font-mono block" {...props}>
                {children}
              </code>
            </pre>
          );
        },
        pre: ({ children }) => <>{children}</>, // Prevent double wrapping
        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 break-words">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 break-words">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2 break-words">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-400 pl-4 italic my-3 break-words">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}

