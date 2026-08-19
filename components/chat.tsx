"use client";

import { Button } from "@/components/ui/button";
import { formatLocalDayLabel, formatLocalTime, localDayKey } from "@/lib/chat-time";
import { playUiSound } from "@/lib/ui-sound";
import { useUserTimeZone } from "@/components/time-zone-provider";
import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
};

type ChatProps = {
  projectId: string;
  currentUserId: string;
  otherUserName: string;
  className?: string;
};

export function Chat({ projectId, currentUserId, otherUserName, className = "" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const timeZone = useUserTimeZone();

  // Reference for the scrollable container
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll only the chat container, not the entire page
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat?projectId=${encodeURIComponent(projectId)}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchMessages();

    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ChatMessage",
          filter: `projectId=eq.${projectId}`,
        },
        () => {
          void fetchMessages();
        },
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void fetchMessages();
    }, 8000);

    function refresh() {
      void fetchMessages();
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [projectId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const messageContent = input.trim();
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          content: messageContent,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [...prev, newMessage]);
        playUiSound("success");
        scrollToBottom();
      } else {
        setInput(messageContent);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setInput(messageContent);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className={`flex h-full min-h-[16rem] flex-col gap-2 overflow-hidden rounded-xl border border-border/10 bg-white/80 p-3 shadow-card ${className}`}>
        <h2 className="text-sm font-semibold">Chat with {otherUserName}</h2>

        <div
            ref={chatContainerRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-border/10 bg-slate-50/80 p-2"
        >
          {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                Loading messages...
              </div>
          ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No messages yet. Start a conversation!
              </div>
          ) : (
              messages.map((message, index) => {
                const previous = messages[index - 1];
                const showDate =
                  !previous || localDayKey(previous.createdAt, timeZone) !== localDayKey(message.createdAt, timeZone);
                const isOwn = message.senderId === currentUserId;

                return (
                  <div key={message.id} className="space-y-2">
                    {showDate ? (
                      <div className="flex justify-center py-1">
                        <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-slate-500">
                          {formatLocalDayLabel(message.createdAt, timeZone)}
                        </span>
                      </div>
                    ) : null}
                    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[92%] rounded-lg px-3 py-1.5 ${
                          isOwn ? "bg-accent text-white" : "bg-slate-200 text-slate-900"
                        }`}
                      >
                        <p className="text-sm leading-snug">{message.content}</p>
                        <p className={`mt-1 text-[10px] leading-none opacity-70 ${isOwn ? "text-right" : "text-left"}`}>
                          {formatLocalTime(message.createdAt, timeZone)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="field-input flex-1 py-1.5"
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()}>
            {loading ? "Sending..." : "Send"}
          </Button>
        </form>
      </div>
  );
}