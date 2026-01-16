"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type { ChatMessage, Source, Document, ReportResponse } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { DocumentSelector } from "@/components/chat/DocumentSelector";
import { SourceSidebar } from "@/components/chat/SourceSidebar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmailDraftModal } from "@/components/agents/EmailDraftModal";
import { JiraTicketModal } from "@/components/agents/JiraTicketModal";
import { ReportModal } from "@/components/agents/ReportModal";
import { AgentExecutionToast } from "@/components/agents/AgentExecutionToast";

/**
 * Citation component with hover tooltip and click to open source sidebar
 */
function CitationWithTooltip({
  number,
  source,
  onClick,
}: {
  number: number;
  source: Source | undefined;
  onClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onClick={onClick}
        className="text-blue-600 font-medium cursor-pointer hover:text-blue-700 mx-0.5 px-1 rounded hover:bg-blue-50 transition-colors text-sm"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        [{number}]
      </button>
      {showTooltip && source && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-sm pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 border border-gray-700">
            <div className="font-medium text-blue-300 mb-1 truncate">
              {source.document_name}
            </div>
            <div className="text-gray-200 leading-relaxed line-clamp-3">
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
 * Renders answer text with markdown, LaTeX, and clickable citation tooltips
 */
function AnswerWithCitations({
  content,
  sources,
  onCitationClick,
}: {
  content: string;
  sources?: Source[];
  onCitationClick?: () => void;
}) {
  return (
    <div className="text-[15px] leading-relaxed text-gray-900">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
        // Clean, minimal styling
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
          return <p className="mb-3 last:mb-0" {...props}>{children}</p>;
        },
        ul: ({ children }) => <ul className="list-disc ml-6 mb-3 space-y-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-6 mb-3 space-y-1.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
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
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-3 max-w-full text-sm" {...props}>
              {children}
            </pre>
          );
        },
        h1: ({ children }) => <h1 className="text-2xl font-semibold mb-3 mt-5 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-4 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-3 first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-medium mb-2 mt-3">{children}</h4>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-200 pl-4 italic my-3 text-gray-600">
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
                onClick={onCitationClick}
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

/**
 * Action Button with ChatGPT-style tooltip
 */
function ActionButton({
  onClick,
  label,
  ariaLabel,
  children,
  className = "",
}: {
  onClick: () => void;
  label: string;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors ${className}`}
        aria-label={ariaLabel}
      >
        {children}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {label}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

const CHAT_STORAGE_KEY = "agentic_workspace_chat_messages";

const EXAMPLE_QUESTIONS = [
  "What are the main topics covered in my documents?",
  "Summarize the key findings from the uploaded documents",
  "What are the most important points I should know?",
  "Can you explain the main concepts in simple terms?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"retrieval" | "generation" | null>(null);
  const [error, setError] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [showSourceSidebar, setShowSourceSidebar] = useState(false);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [emailModalContext, setEmailModalContext] = useState("");
  const [jiraModalDescription, setJiraModalDescription] = useState("");
  const [reportModalDocIds, setReportModalDocIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{
    type: "email" | "jira" | "report";
    status: "success" | "failed" | "executing";
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  } | null>(null);
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

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      setLoadingStage(null);
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

    const queryText = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setLoadingStage("retrieval");
    setError("");

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

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
      // Simulate retrieval phase, then switch to generation
      setTimeout(() => {
        if (!controller.signal.aborted) {
          setLoadingStage("generation");
        }
      }, 500);

      // Use streaming API
      await apiClient.queryDocumentsStream(
        queryText,
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        // onToken
        (token: string) => {
          if (controller.signal.aborted) return;
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
          if (controller.signal.aborted) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, sources } : msg
            )
          );
          setCurrentSources(sources);
        },
        // onComplete
        () => {
          setLoading(false);
          setLoadingStage(null);
          setAbortController(null);
        },
        // onError
        (err: Error) => {
          // Remove empty assistant message on error
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          setError(err.message);
          setLoading(false);
          setLoadingStage(null);
          setAbortController(null);
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled, don't show error
        setLoading(false);
        setLoadingStage(null);
        setAbortController(null);
        return;
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
      setLoadingStage(null);
      setAbortController(null);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could show toast here
  };

  const handleRegenerate = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message && message.role === "user") {
      setInput(message.content);
      // Scroll to input
      setTimeout(() => {
        document.querySelector('input[type="text"]')?.focus();
      }, 100);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const handleFeedback = async (messageId: string, feedback: "thumbs_up" | "thumbs_down") => {
    // Find the evaluation run ID if available, or create a new one
    // For now, just update the message with feedback
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
    // In production, you'd call: await apiClient.submitFeedback(runId, feedback);
  };

  const handleRegenerateAssistant = async (message: ChatMessage) => {
    const messageIndex = messages.indexOf(message);
    const precedingUserMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
    
    if (!precedingUserMessage || precedingUserMessage.role !== "user") {
      return;
    }
    
    // Delete the current assistant message and regenerate
    setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    
    // Resubmit the user's query
    const queryText = precedingUserMessage.content;
    setLoading(true);
    setLoadingStage("retrieval");
    setError("");
    
    const controller = new AbortController();
    setAbortController(controller);
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    
    setTimeout(() => {
      if (!controller.signal.aborted) {
        setLoadingStage("generation");
      }
    }, 500);
    
    try {
      await apiClient.queryDocumentsStream(
        queryText,
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        (token: string) => {
          if (controller.signal.aborted) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        (sources: Source[]) => {
          if (controller.signal.aborted) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, sources } : msg
            )
          );
          setCurrentSources(sources);
        },
        () => {
          setLoading(false);
          setLoadingStage(null);
          setAbortController(null);
        },
        (err: Error) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          setError(err.message);
          setLoading(false);
          setLoadingStage(null);
          setAbortController(null);
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setLoading(false);
        setLoadingStage(null);
        setAbortController(null);
        return;
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
      setLoadingStage(null);
      setAbortController(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Minimal Header - Only show when there are messages */}
      {messages.length > 0 && (
        <div className="border-b border-gray-200 px-6 py-3 flex-shrink-0 bg-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-medium text-gray-900">Chat</h1>
            <button
              onClick={handleClearChat}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
              title="Clear chat history"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setError("");
                const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
                if (lastUserMessage) {
                  setInput(lastUserMessage.content);
                }
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area - Clean and minimal */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
              <div className="text-center w-full max-w-xl">
                <h2 className="text-3xl font-light text-gray-900 mb-4">
                  What's on your mind today?
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  Ask questions about your documents and get AI-powered answers
                </p>
                
                {/* Example Questions - Cleaner design */}
                <div className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(question)}
                      className="w-full p-3 text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-8">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex group relative animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                >
                  <div
                    className={`max-w-[85%] min-w-0 relative ${
                      message.role === "user"
                        ? "bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3"
                        : "text-gray-900"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose-content">
                        <AnswerWithCitations
                          content={message.content}
                          sources={message.sources}
                          onCitationClick={() => {
                            if (message.sources) {
                              setCurrentSources(message.sources);
                              setShowSourceSidebar(true);
                            }
                          }}
                        />
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                              onClick={() => {
                                setCurrentSources(message.sources!);
                                setShowSourceSidebar(true);
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              View {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                            </button>
                          </div>
                        )}
                        
                        {/* All Action Icons at Bottom - ChatGPT Style */}
                        <div className="mt-4 pt-3 flex items-center gap-1 border-t border-gray-100">
                          {/* Copy */}
                          <ActionButton
                            onClick={() => handleCopyMessage(message.content)}
                            label="Copy"
                            ariaLabel="Copy message"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </ActionButton>
                          
                          {/* Email */}
                          <ActionButton
                            onClick={() => {
                              setEmailModalContext(message.content);
                              setShowEmailModal(true);
                            }}
                            label="Email"
                            ariaLabel="Generate email"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </ActionButton>
                          
                          {/* Jira */}
                          <ActionButton
                            onClick={() => {
                              setJiraModalDescription(message.content);
                              setShowJiraModal(true);
                            }}
                            label="Jira"
                            ariaLabel="Create Jira ticket"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </ActionButton>
                          
                          {/* Report/Summary */}
                          <ActionButton
                            onClick={() => {
                              if (message.sources) {
                                const docIds = message.sources
                                  .map((s) => s.id)
                                  .filter((id): id is number => typeof id === "number");
                                setReportModalDocIds(docIds);
                              }
                              setShowReportModal(true);
                            }}
                            label="Report"
                            ariaLabel="Generate report"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </ActionButton>
                          
                          {/* Regenerate (for assistant messages) */}
                          {message.role === "assistant" && (() => {
                            const messageIndex = messages.indexOf(message);
                            const precedingUserMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
                            const canRegenerate = precedingUserMessage && precedingUserMessage.role === "user";
                            
                            return canRegenerate ? (
                              <ActionButton
                                onClick={() => handleRegenerateAssistant(message)}
                                label="Regenerate"
                                ariaLabel="Regenerate response"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </ActionButton>
                            ) : null;
                          })()}
                          
                          {/* Delete */}
                          <ActionButton
                            onClick={() => {
                              if (confirm("Delete this message?")) {
                                handleDeleteMessage(message.id);
                              }
                            }}
                            label="Delete"
                            ariaLabel="Delete message"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </ActionButton>
                          
                          {/* Feedback buttons */}
                          <div className="ml-auto flex items-center gap-1">
                            <ActionButton
                              onClick={() => handleFeedback(message.id, "thumbs_up")}
                              label="Good response"
                              ariaLabel="Thumbs up"
                              className={(message as any).feedback === "thumbs_up" ? "bg-green-100 text-green-700" : ""}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </ActionButton>
                            <ActionButton
                              onClick={() => handleFeedback(message.id, "thumbs_down")}
                              label="Poor response"
                              ariaLabel="Thumbs down"
                              className={(message as any).feedback === "thumbs_down" ? "bg-red-100 text-red-700" : ""}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.content}</p>
                    )}
                    
                    {/* Timestamp - Minimal */}
                    {message.role === "user" && (
                      <div className="mt-1 text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator - Minimal */}
              {loading && loadingStage && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>
                      {loadingStage === "retrieval" ? "Searching documents..." : "Generating answer..."}
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Clean ChatGPT-style */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* Document Selector - Minimal, only show when documents selected */}
          {selectedDocumentIds.length > 0 && (
            <div className="mb-3">
              <DocumentSelector
                selectedDocumentIds={selectedDocumentIds}
                onSelectionChange={setSelectedDocumentIds}
              />
            </div>
          )}
          
          {/* Stop Generation Button - Minimal */}
          {loading && (
            <div className="mb-3 flex items-center justify-center">
              <button
                onClick={handleStopGeneration}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                Stop
              </button>
            </div>
          )}

          {/* Main Input - ChatGPT style */}
          <form onSubmit={handleSubmit} className="relative group">
            <div className="relative flex items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything"
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 transition-all text-[15px] text-gray-900 placeholder:text-gray-400"
                />
                {/* Plus icon on left - for document selector */}
                <button
                  type="button"
                  onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Select documents"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {/* Document selector dropdown */}
                {showDocumentSelector && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDocumentSelector(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                      <DocumentSelector
                        selectedDocumentIds={selectedDocumentIds}
                        onSelectionChange={(ids) => {
                          setSelectedDocumentIds(ids);
                          setShowDocumentSelector(false);
                        }}
                      />
                    </div>
                  </>
                )}
                {/* Send/Stop button on right */}
                <div className="absolute right-2 bottom-1.5">
                  {loading ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                      title="Stop generation"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                  ) : input.trim() ? (
                    <button
                      type="submit"
                      className="p-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                      title="Send message"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            
            {/* Quick Agent Actions - Minimal, appear on input focus/hover */}
            <div className="mt-2 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => {
                  setEmailModalContext("");
                  setShowEmailModal(true);
                }}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-1.5"
                title="Email Draft"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJiraModalDescription("");
                  setShowJiraModal(true);
                }}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-1.5"
                title="Jira Ticket"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Jira</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportModalDocIds([]);
                  setShowReportModal(true);
                }}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-1.5"
                title="Generate Report"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Report</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modals */}
      <EmailDraftModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailModalContext("");
        }}
        initialContext={emailModalContext}
        onSuccess={(action) => {
          // Show toast notification
          setToast({
            type: "email",
            status: action.status,
            message: action.description,
            actionUrl: action.metadata?.ticketUrl,
            actionLabel: action.status === "success" ? "View Email" : undefined,
          });
          
          // Add message to chat if successful
          if (action.status === "success") {
            const emailMessage: ChatMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: `**Email Sent Successfully!**\n\n**To:** ${action.metadata?.recipient}\n**Subject:** ${action.metadata?.subject}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, emailMessage]);
          }
        }}
      />

      <JiraTicketModal
        isOpen={showJiraModal}
        onClose={() => {
          setShowJiraModal(false);
          setJiraModalDescription("");
        }}
        initialDescription={jiraModalDescription}
        onSuccess={(action) => {
          // Show toast notification
          setToast({
            type: "jira",
            status: action.status,
            message: action.description,
            actionUrl: action.metadata?.ticketUrl,
            actionLabel: action.status === "success" ? "View Ticket" : undefined,
          });
          
          // Add message to chat if successful
          if (action.status === "success") {
            const jiraMessage: ChatMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: `**Jira Ticket Created Successfully!**\n\n**Ticket:** ${action.metadata?.ticketKey}\n**URL:** [View Ticket](${action.metadata?.ticketUrl})`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, jiraMessage]);
          }
        }}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportModalDocIds([]);
        }}
        initialDocumentIds={reportModalDocIds}
        onSuccess={(action) => {
          // Show toast notification
          setToast({
            type: "report",
            status: action.status,
            message: action.description,
            actionUrl: action.metadata?.reportUrl,
            actionLabel: action.status === "success" ? "View Report" : undefined,
          });
          
          // Add message to chat if successful
          if (action.status === "success") {
            const reportTypeLabels: Record<string, string> = {
              summary: "Summary",
              analysis: "Analysis",
              detailed: "Detailed",
            };
            const reportTypeLabel = reportTypeLabels[action.metadata?.reportType] || action.metadata?.reportType;
            
            const reportMessage: ChatMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: `**📊 Report Generated Successfully!**\n\n**Type:** ${reportTypeLabel} Report\n**Documents:** ${action.metadata?.documentCount} document(s)\n\n[View Report](${action.metadata?.reportUrl})`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, reportMessage]);
          }
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
      
      {/* Source Sidebar */}
      <SourceSidebar
        sources={currentSources}
        isOpen={showSourceSidebar}
        onClose={() => setShowSourceSidebar(false)}
      />
      
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <AgentExecutionToast
            type={toast.type}
            status={toast.status}
            message={toast.message}
            actionUrl={toast.actionUrl}
            actionLabel={toast.actionLabel}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}

