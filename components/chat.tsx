"use client";

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
};

export function Chat({ projectId, currentUserId, otherUserName }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Reference for the scrollable container
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll only the chat container, not the entire page
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat?projectId=${projectId}`);
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
    fetchMessages();
    setIsLoadingMessages(false);

    // Poll for new messages every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
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
      // Using h-full to fill the parent container
      <div className="flex h-full flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Chat with {otherUserName}</h2>

        <div
            ref={chatContainerRef}
            className="flex-1 space-y-3 overflow-y-auto rounded-lg border bg-slate-50 p-4"
        >
          {isLoadingMessages ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                Loading messages...
              </div>
          ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                No messages yet. Start a conversation!
              </div>
          ) : (
              messages.map((message) => (
                  <div
                      key={message.id}
                      className={`flex ${message.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                        className={`max-w-[85%] break-words rounded-lg px-4 py-2 ${
                            message.senderId === currentUserId
                                ? "bg-blue-500 text-white"
                                : "bg-slate-200 text-slate-900"
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="mt-1 text-xs opacity-75">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
              ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
          <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
  );
}