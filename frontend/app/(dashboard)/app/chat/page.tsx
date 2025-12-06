"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type { ChatMessage, Source, Document, ReportResponse } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Citation component with hover tooltip showing source content
 */
function CitationWithTooltip({
  number,
  source,
}: {
  number: number;
  source: Source | undefined;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        className="text-blue-600 font-medium cursor-help hover:text-blue-800 hover:underline"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        [{number}]
      </span>
      {showTooltip && source && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-sm">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 border border-gray-700">
            <div className="font-semibold text-blue-300 mb-1 truncate">
              {source.document_name}
            </div>
            <div className="text-gray-200 leading-relaxed line-clamp-4">
              {source.snippet}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Renders answer text with markdown, LaTeX, and hoverable citation tooltips
 */
function AnswerWithCitations({
  content,
  sources,
}: {
  content: string;
  sources?: Source[];
}) {
  return (
    <div className="text-[15px] leading-7 text-gray-900">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
        // Clean, readable styling
        p: ({ children, ...props }: any) => {
          // Check if this paragraph only contains a pre element (block code)
          // If so, don't wrap in p tag to avoid invalid HTML nesting
          const childrenArray = React.Children.toArray(children);
          if (childrenArray.length === 1) {
            const child = childrenArray[0] as any;
            if (child && typeof child === 'object' && child.type === 'pre') {
              return <>{children}</>;
            }
          }
          return <p className="mb-4 last:mb-0" {...props}>{children}</p>;
        },
        ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-7">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ inline, children, ...props }: any) => {
          return inline ? (
            <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[14px] font-mono" {...props}>
              {children}
            </code>
          ) : (
            <code className="text-[13px] font-mono block" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children, ...props }: any) => {
          // Pre component wraps block code - ensure it's not nested in p
          return (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-4 max-w-full" {...props}>
              {children}
            </pre>
          );
        },
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold mb-3 mt-4 first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3">{children}</h4>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => {
          // Intercept report links to open in modal instead of new tab
          if (href && (href.includes("/agent/reports/") || href.includes("/reports/"))) {
            // Extract report ID from URL (format: /api/v1/agent/reports/{reportId} or /agent/reports/{reportId})
            const reportIdMatch = href.match(/\/reports\/([^\/\?]+)/);
            const reportId = reportIdMatch ? reportIdMatch[1] : null;
            
            if (reportId) {
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const onOpenReport = (window as any).openReportModal;
                    if (onOpenReport) {
                      onOpenReport(reportId);
                    }
                  }}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  {children}
                </a>
              );
            }
          }
          return (
            <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
        hr: () => <hr className="my-6 border-gray-300" />,
        // Custom text renderer to handle citations
        text: ({ children }: any) => {
          const text = String(children);
          // Parse and replace citation numbers [1], [2], etc.
          const parts: (string | React.ReactElement)[] = [];
          const regex = /\[(\d+)\]/g;
          let lastIndex = 0;
          let match;
          let key = 0;

          while ((match = regex.exec(text)) !== null) {
            // Add text before citation
            if (match.index > lastIndex) {
              parts.push(text.slice(lastIndex, match.index));
            }
            // Add citation tooltip
            const citationNumber = parseInt(match[1], 10);
            const source = sources?.[citationNumber - 1];
            parts.push(
              <CitationWithTooltip
                key={`cite-${key++}`}
                number={citationNumber}
                source={source}
              />
            );
            lastIndex = regex.lastIndex;
          }

          // Add remaining text
          if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
          }

          return <>{parts.length > 0 ? parts : children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}

/**
 * Email Draft Modal Component
 */
function EmailDraftModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subject: string, body: string) => void;
}) {
  const [context, setContext] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!context.trim()) {
      setError("Please provide context for the email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const draft = await apiClient.generateEmailDraft(context, recipient || undefined, tone);
      setResult(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate email draft");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (result) {
      onSuccess(result.subject, result.body);
      handleClose();
    }
  };

  const handleSend = async () => {
    if (!result) return;
    
    if (!toEmail.trim()) {
      setError("Please enter a recipient email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = toEmail.split(",").map(e => e.trim());
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    
    if (invalidEmails.length > 0) {
      setError(`Invalid email address(es): ${invalidEmails.join(", ")}`);
      return;
    }

    try {
      setSending(true);
      setError("");
      await apiClient.sendEmail(
        emails,
        result.subject,
        result.body
      );
      setSendSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setContext("");
    setRecipient("");
    setTone("professional");
    setError("");
    setResult(null);
    setToEmail("");
    setSending(false);
    setSendSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Generate Email Draft</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {!result ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Context / Topic *
                  </label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Describe what the email should be about..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient (optional)
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Recipient name or email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !context.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Generating..." : "Generate Draft"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To (Email Address) *
                  </label>
                  <input
                    type="text"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="recipient@example.com (comma-separated for multiple)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                    disabled={sending || sendSuccess}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter recipient email address(es), separated by commas for multiple recipients
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={result.subject}
                    onChange={(e) => setResult({ ...result, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={sending || sendSuccess}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body
                  </label>
                  <textarea
                    value={result.body}
                    onChange={(e) => setResult({ ...result, body: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    rows={10}
                    disabled={sending || sendSuccess}
                  />
                </div>
              </div>

              {sendSuccess && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
                  Email sent successfully!
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  disabled={sending || sendSuccess}
                >
                  Back
                </button>
                <button
                  onClick={handleUse}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  disabled={sending || sendSuccess}
                >
                  Use This Draft
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || sendSuccess || !toEmail.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending..." : "Send Email"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Jira Ticket Modal Component
 */
function JiraTicketModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticketKey: string, ticketUrl: string) => void;
}) {
  const [projectKey, setProjectKey] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("Task");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!projectKey.trim() || !summary.trim() || !description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await apiClient.createJiraTicket(projectKey, summary, description, issueType);
      onSuccess(result.ticket_key, result.ticket_url);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Jira ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProjectKey("");
    setSummary("");
    setDescription("");
    setIssueType("Task");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Create Jira Ticket</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Key *
              </label>
              <input
                type="text"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                placeholder="e.g., PROJ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary *
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary of the ticket"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the issue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                rows={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Type
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
                <option value="Story">Story</option>
                <option value="Epic">Epic</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !projectKey.trim() || !summary.trim() || !description.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Report Generation Modal Component
 */
function ReportModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reportResponse: ReportResponse) => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [reportType, setReportType] = useState("summary");
  const [format, setFormat] = useState("html");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      const docs = await apiClient.listDocuments();
      setDocuments(docs.filter((d) => d.status === "completed"));
    } catch (err) {
      setError("Failed to load documents");
    }
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      setError("Please select at least one document");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await apiClient.generateReport(selectedDocIds, reportType, format);
      onSuccess(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDocIds([]);
    setReportType("summary");
    setFormat("html");
    setError("");
    onClose();
  };

  const toggleDocument = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Generate Report</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Documents *
              </label>
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                {documents.length === 0 ? (
                  <div className="p-4 text-gray-500 text-sm">No completed documents available</div>
                ) : (
                  <div className="divide-y">
                    {documents.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={() => toggleDocument(doc.id)}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-900">{doc.filename}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="summary">Summary</option>
                <option value="analysis">Analysis</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="html">HTML</option>
                <option value="pdf" disabled>PDF (Coming Soon)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || selectedDocIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Report Viewer Modal Component
 */
function ReportViewerModal({
  isOpen,
  onClose,
  reportId,
}: {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | null;
}) {
  const [reportContent, setReportContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && reportId) {
      loadReport();
    } else {
      setReportContent("");
      setError("");
    }
  }, [isOpen, reportId]);

  const loadReport = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      setError("");
      const content = await apiClient.getReport(reportId);
      setReportContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Report Viewer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading report...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: reportContent }}
              className="prose max-w-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}

const CHAT_STORAGE_KEY = "agentic_workspace_chat_messages";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        const restoredMessages: ChatMessage[] = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(restoredMessages);
      }
    } catch (err) {
      console.error("Failed to load chat messages from localStorage:", err);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized.current) return; // Don't save on initial load

    try {
      // Convert Date objects to strings for storage
      const messagesToSave = messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (err) {
      console.error("Failed to save chat messages to localStorage:", err);
    }
  }, [messages]);

  // Expose function to open report modal (for markdown link interception)
  useEffect(() => {
    (window as any).openReportModal = (reportId: string) => {
      setCurrentReportId(reportId);
      setShowReportViewer(true);
    };
    return () => {
      delete (window as any).openReportModal;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear all chat messages? This cannot be undone.")) {
      setMessages([]);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    // Create placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Use streaming API
      await apiClient.queryDocumentsStream(
        input,
        undefined,
        // onToken
        (token: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        // onSources
        (sources: Source[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, sources } : msg
            )
          );
        },
        // onComplete
        () => {
          setLoading(false);
        },
        // onError
        (err: Error) => {
          // Remove empty assistant message on error
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Compact */}
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">RAG Chat</h1>
              <p className="text-sm text-gray-600 mt-1">
                Ask questions about your documents
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Clear chat history"
              >
                Clear Chat
              </button>
            )}
          </div>
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area - This is the ONLY scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-20rem)]">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-6">💬</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Start a conversation</h2>
                <p className="text-gray-600 max-w-md">
                  Ask questions about your uploaded documents and get AI-powered answers with citations
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] min-w-0 rounded-2xl px-5 py-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 border border-gray-200 text-gray-900"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose-content">
                        <AnswerWithCitations
                          content={message.content}
                          sources={message.sources}
                        />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Sticky bottom */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📧</span>
              <span>Email Draft</span>
            </button>
            <button
              onClick={() => setShowJiraModal(true)}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🎫</span>
              <span>Jira Ticket</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📊</span>
              <span>Generate Report</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={loading}
                className="flex-1 px-5 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition text-[15px] text-gray-900 placeholder:text-gray-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium shadow-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Sending</span>
                  </>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modals */}
      <EmailDraftModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={(subject, body) => {
          // Add email draft to chat
          const emailMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `**Email Draft Generated**\n\n**Subject:** ${subject}\n\n**Body:**\n${body}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, emailMessage]);
        }}
      />

      <JiraTicketModal
        isOpen={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        onSuccess={(ticketKey, ticketUrl) => {
          // Add success message to chat
          const jiraMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `**Jira Ticket Created Successfully!**\n\n**Ticket:** ${ticketKey}\n**URL:** [View Ticket](${ticketUrl})`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, jiraMessage]);
        }}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={(reportResponse) => {
          // Format report type for display
          const reportTypeLabels: Record<string, string> = {
            summary: "Summary",
            analysis: "Analysis",
            detailed: "Detailed",
          };
          const reportTypeLabel = reportTypeLabels[reportResponse.report_type] || reportResponse.report_type;
          
          // Format document names (show first 3, then "and X more" if needed)
          const maxDocsToShow = 3;
          const docNamesToShow = reportResponse.document_names.slice(0, maxDocsToShow);
          const remainingCount = reportResponse.document_names.length - maxDocsToShow;
          let docNamesList = "";
          
          if (reportResponse.document_names.length === 0) {
            docNamesList = "No documents";
          } else if (reportResponse.document_names.length <= maxDocsToShow) {
            docNamesList = reportResponse.document_names.map(name => `• ${name}`).join("\n");
          } else {
            docNamesList = docNamesToShow.map(name => `• ${name}`).join("\n") + `\n• ... and ${remainingCount} more`;
          }
          
          // Create formatted message with metadata
          const reportMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `**📊 Report Generated Successfully!**\n\n**Type:** ${reportTypeLabel} Report\n**Documents:** ${reportResponse.document_count} document${reportResponse.document_count !== 1 ? 's' : ''}\n\n${docNamesList}\n\n[View Report](${reportResponse.report_url})`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, reportMessage]);
        }}
      />

      <ReportViewerModal
        isOpen={showReportViewer}
        onClose={() => {
          setShowReportViewer(false);
          setCurrentReportId(null);
        }}
        reportId={currentReportId}
      />
    </div>
  );
}

