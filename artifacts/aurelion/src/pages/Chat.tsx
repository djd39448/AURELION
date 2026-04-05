/**
 * @module pages/Chat
 * @description AI Concierge chat page with real-time streaming responses.
 *
 * Access control:
 *  - Non-Premium users see a PremiumLockEnhanced component instead of the chat UI.
 *  - Premium check considers profile tier, admin role, and purchase history.
 *
 * Features:
 *  - Message history loaded via `useGetChatMessages`.
 *  - Streaming responses via SSE (POST /api/chat/sessions/:id/messages/stream).
 *  - Tokens appear word-by-word as the AI generates them.
 *  - Typing indicator (animated dots) while waiting for first token.
 *  - Blinking cursor during streaming.
 *  - Suggested starter questions when conversation is empty.
 *  - Auto-scroll to bottom on new messages.
 *  - Fallback to non-streaming mutation if stream fails.
 *
 * @route /chat/:sessionId
 * @auth Required (implicitly via API)
 * @tier Premium required
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  useGetChatMessages,
  useGetMe,
  useListPurchases,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Sparkles, ChevronLeft } from "lucide-react";
import { PremiumLockEnhanced } from "@/components/ui/premium-lock-enhanced";
import { useToast } from "@/hooks/use-toast";

/** Suggested first questions to reduce blank-conversation anxiety. */
const STARTER_QUESTIONS = [
  "What are the best snorkel tours for families?",
  "Show me off-road adventures under $150",
  "What should I book in advance?",
  "Plan a 3-day adventure itinerary",
];

/**
 * Chat page component (AI Concierge) with streaming support.
 *
 * @route /chat/:sessionId
 * @auth Required
 * @tier Premium
 */
export default function Chat() {
  const params = useParams();
  const sessionId = parseInt(params.sessionId || "0", 10);
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  /** True while streaming tokens from the backend SSE endpoint. */
  const [isStreaming, setIsStreaming] = useState(false);
  /** Accumulated text from the current streaming response. */
  const [streamingText, setStreamingText] = useState("");

  const { data: user } = useGetMe();
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated },
  });

  const { data: messages, refetch } = useGetChatMessages(sessionId, {
    query: { enabled: !!sessionId, queryKey: [`/api/chat/${sessionId}`] },
  });

  const userTier = user?.tier ?? "free";
  const isPremium =
    userTier === "premium" ||
    user?.role === "admin" ||
    purchases?.some((p) => p.productType === "PREMIUM");

  /** Auto-scroll when messages change or streaming text updates. */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  /**
   * Send a message and stream the AI response via SSE.
   * Uses fetch + ReadableStream to process server-sent events.
   * Falls back to refetching messages on completion so the DB-persisted
   * response is loaded into the React Query cache.
   */
  const handleSend = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const text = content.trim();
      if (!text || isStreaming) return;

      setContent("");
      setIsStreaming(true);
      setStreamingText("");

      try {
        const response = await fetch(
          `/api/chat/sessions/${sessionId}/messages/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                toast({
                  title: "AI Error",
                  description: data.error,
                  variant: "destructive",
                });
                break;
              }

              if (data.done) {
                // Streaming complete — refetch to get persisted messages
                break;
              }

              if (data.content) {
                setStreamingText((prev) => prev + data.content);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch {
        toast({
          title: "Message failed",
          description: "Could not send message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        // Refetch to pick up both user message and AI response from DB
        refetch();
      }
    },
    [content, isStreaming, sessionId, refetch, toast]
  );

  /** Handle clicking a starter question — fill input and send. */
  const handleStarterClick = (question: string) => {
    setContent(question);
    // Small delay so the state updates before handleSend reads it
    setTimeout(() => {
      setContent("");
      setIsStreaming(true);
      setStreamingText("");

      fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: question }),
      })
        .then(async (response) => {
          if (!response.ok || !response.body) throw new Error("Stream failed");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) setStreamingText((prev) => prev + data.content);
                if (data.error) {
                  toast({ title: "AI Error", description: data.error, variant: "destructive" });
                }
              } catch {}
            }
          }
        })
        .catch(() => {
          toast({ title: "Message failed", description: "Could not send message.", variant: "destructive" });
        })
        .finally(() => {
          setIsStreaming(false);
          setStreamingText("");
          refetch();
        });
    }, 0);
  };

  if (!isPremium) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24">
        <PremiumLockEnhanced
          title="AI Concierge Access"
          description="Upgrade to Concierge membership to chat with our locally-trained AI planning assistant 24/7."
          features={[
            "Unlimited AI concierge conversations",
            "Personalized activity recommendations",
            "Real-time itinerary optimization",
            "Insider booking intelligence",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI Concierge
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Ask for recommendations, booking advice, or local secrets.
          </p>
        </div>
      </div>

      {/* Message area */}
      <ScrollArea className="flex-1 pr-4 mb-6" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {/* Empty state with starter questions */}
          {messages?.length === 0 && !isStreaming && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <h3 className="font-serif text-xl mb-2 text-foreground">
                Welcome to Aurelion Concierge
              </h3>
              <p className="text-muted-foreground font-light max-w-md mx-auto mb-8">
                I'm your personal Aruba planning assistant with insider knowledge
                on {11} verified vendors. How can I help?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleStarterClick(q)}
                    className="bg-card border border-border rounded-lg p-3 text-left hover:border-primary/50 hover:shadow-lg transition-all duration-200 group"
                  >
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {q}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persisted messages */}
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-primary"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground rounded-tr-none"
                    : "bg-card border border-border text-foreground rounded-tl-none font-light leading-relaxed"
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming AI response — appears token-by-token */}
          {isStreaming && streamingText && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="max-w-[80%] bg-card border border-border p-4 rounded-2xl rounded-tl-none font-light leading-relaxed">
                <div className="prose prose-invert prose-sm max-w-none">
                  {streamingText.split("\n").map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                  {/* Blinking cursor */}
                  <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator before first token arrives */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Compose bar */}
      <form onSubmit={handleSend} className="relative mt-auto">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ask the concierge..."
          className="w-full bg-card border-border pr-12 h-14 text-base focus-visible:ring-primary rounded-xl"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-2 top-2 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          disabled={!content.trim() || isStreaming}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
