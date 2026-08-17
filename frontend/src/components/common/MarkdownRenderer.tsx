"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 style={{ fontSize: "16px", fontWeight: 700, margin: "10px 0 6px", color: "var(--text-primary)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "8px 0 4px", color: "var(--text-primary)" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "6px 0 4px", color: "var(--text-primary)" }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ margin: "4px 0 6px", lineHeight: "1.55" }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: "italic" }}>
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: "18px", margin: "4px 0 6px", listStyleType: "disc" }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: "18px", margin: "4px 0 6px", listStyleType: "decimal" }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ margin: "2px 0", lineHeight: "1.5" }}>
              {children}
            </li>
          ),
          code: ({ children }) => (
            <code
              style={{
                background: "var(--surface-subtle)",
                padding: "2px 5px",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "var(--font-mono, monospace)",
                border: "1px solid var(--border)",
              }}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "3px solid var(--accent)",
                paddingLeft: "10px",
                margin: "6px 0",
                color: "var(--text-secondary)",
                fontStyle: "italic",
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
