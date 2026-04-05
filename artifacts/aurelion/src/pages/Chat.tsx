/**
 * @module pages/Chat
 * @description AI Concierge chat page. Provides a real-time conversational
 * interface where Premium-tier users can ask for Aruba travel recommendations,
 * booking advice, and local secrets.
 *
 * Access control:
 *  - Non-Premium users see a full-page PremiumLock component instead of the chat UI.
 *  - Premium check considers profile tier, admin role, and purchase history.
 *
 * Features:
 *  - Message history loaded via `useGetChatMessages`.
 *  - New messages sent via `useSendChatMessage` mutation; message list is
 *    refetched on success to show both the user's message and the AI response.
 *  - Auto-scroll to bottom of message list when messages change.
 *  - Typing indicator (animated dots) while the send mutation is pending.
 *  - Empty state with a welcome prompt when no messages exist.
 *
 * @route /chat/:sessionId
 * @auth Required (implicitly via API)
 * @tier Premium required
 */

import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetChatMessages,
  useSendChatMessage,
  useGetMe,
  useListPurchases
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Sparkles, ChevronLeft } from "lucide-react";
import { PremiumLockEnhanced } from "@/components/ui/premium-lock-enhanced";
import { useToast } from "@/hooks/use-toast";

/**
 * Chat page component (AI Concierge).
 *
 * @route /chat/:sessionId
 * @auth Required
 * @tier Premium
 */
export default function Chat() {
  /** Extract the chat session ID from the URL. */
  const params = useParams();
  const sessionId = parseInt(params.sessionId || "0", 10);
  /** Controlled input state for the message compose field. */
  const [content, setContent] = useState("");
  /** Ref to the scroll container — used to auto-scroll to the latest message. */
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  /** Query: current user profile (for tier check). */
  const { data: user } = useGetMe();
  /** Query: purchase history (for tier check). */
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated }
  });

  /** Query: chat message history for this session. Re-fetched after each sent message. */
  const { data: messages, refetch } = useGetChatMessages(sessionId, {
    query: { enabled: !!sessionId, queryKey: [`/api/chat/${sessionId}`] }
  });

  /** Mutation: send a new user message to the AI concierge. */
  const sendMutation = useSendChatMessage();

  // -- Premium tier check --
  const userTier = user?.tier ?? "free";
  /** True if user has Premium access (profile tier, admin role, or PREMIUM purchase). */
  const isPremium = userTier === "premium" || user?.role === "admin" || purchases?.some(p => p.productType === 'PREMIUM');

  /**
   * Auto-scroll effect: whenever the messages array changes (new message received),
   * scroll the chat container to the bottom so the latest message is visible.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Send message handler. Prevents default form submission, guards against
   * empty input, sends the message, then clears the input and refetches
   * messages to pick up both the user message and AI response.
   */
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMutation.mutate(
      { sessionId, data: { content } },
      {
        onSuccess: () => {
          setContent("");
          // Refetch to get both the sent message and the AI's response
          refetch();
        },
        onError: () => {
          toast({
            title: "Message failed",
            description: "Could not send message. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
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
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
        <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
          <Link href="/dashboard"><ChevronLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI Concierge
          </h1>
          <p className="text-sm text-muted-foreground font-light">Ask for recommendations, booking advice, or local secrets.</p>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4 mb-6" ref={scrollRef}>
        <div className="space-y-6 pb-4">
          {messages?.length === 0 && (
            <div className="text-center py-24">
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <h3 className="font-serif text-xl mb-2 text-foreground">Welcome to Aurelion Concierge</h3>
              <p className="text-muted-foreground font-light max-w-md mx-auto">
                I'm your personal Aruba planning assistant. How can I help craft your perfect itinerary today?
              </p>
            </div>
          )}
          
          {messages?.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-primary'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-primary/10 text-foreground rounded-tr-none' 
                  : 'bg-card border border-border text-foreground rounded-tl-none font-light leading-relaxed'
              }`}>
                <div className="prose prose-invert prose-sm max-w-none">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {sendMutation.isPending && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="relative mt-auto">
        <Input 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ask the concierge..."
          className="w-full bg-card border-border pr-12 h-14 text-base focus-visible:ring-primary rounded-xl"
          disabled={sendMutation.isPending}
        />
        <Button 
          type="submit" 
          size="icon" 
          className="absolute right-2 top-2 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          disabled={!content.trim() || sendMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
