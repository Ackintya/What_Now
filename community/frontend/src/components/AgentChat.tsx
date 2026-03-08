"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AgentChat({ userId = "" }: { userId?: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [profileContext, setProfileContext] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const dragState = useRef({
    isDragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startPosX: 0,
    startPosY: 0,
    moved: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
    setInitialized(true);

    if (userId) {
      try {
        const stored = localStorage.getItem(`wb_agent_profile_${userId}`);
        if (stored) {
          const { context, timestamp } = JSON.parse(stored);
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            setProfileContext(context);
          } else {
            localStorage.removeItem(`wb_agent_profile_${userId}`);
          }
        }
      } catch { /* ignore malformed */ }
    }
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadHistory = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/agent/history?userId=${uid}`);
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(data.messages.slice(-20));
      }
    } catch {
      // silently ignore — history is a nice-to-have
    }
  }, []);

  const buildProfile = useCallback(
    async (uid: string) => {
      setProfileLoading(true);
      try {
        const res = await fetch(`/api/agent/profile?userId=${uid}`);
        const data = await res.json();
        const ctx = data.profileContext || "A health-conscious WellBeing app user.";
        setProfileContext(ctx);
        // Save to localStorage as a fast local cache for this origin
        localStorage.setItem(`wb_agent_profile_${uid}`, JSON.stringify({
          context: ctx,
          timestamp: Date.now(),
        }));
      } catch {
        // If API fails, try loading from localStorage as fallback
        try {
          const stored = localStorage.getItem(`wb_agent_profile_${uid}`);
          if (stored) {
            const { context } = JSON.parse(stored);
            if (context) { setProfileContext(context); return; }
          }
        } catch { /* ignore */ }
        setProfileContext("A WellBeing app user focused on health and wellness.");
      } finally {
        setProfileLoading(false);
      }
    },
    []
  );

  const handleStickerClick = useCallback(() => {
    if (dragState.current.moved) return;
    setIsOpen((prev) => {
      const opening = !prev;
      if (opening && userId) {
        loadHistory(userId);   // restore previous messages
        buildProfile(userId);  // rebuild fresh profile
      }
      return opening;
    });
  }, [userId, buildProfile, loadHistory]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending || profileLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg].slice(-10);
    setMessages(updated);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          profileContext: profileContext || "",
          messages: updated.slice(0, -1),
          message: userMsg.content,
        }),
      });
      const data = await res.json();
      setMessages((prev) =>
        [
          ...prev,
          {
            role: "assistant" as const,
            content:
              data.response ||
              "I couldn't process that. Please try again.",
          },
        ].slice(-10)
      );
    } catch {
      setMessages((prev) =>
        [
          ...prev,
          {
            role: "assistant" as const,
            content: "Connection issue. Please try again.",
          },
        ].slice(-10)
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, profileLoading, messages, userId, profileContext]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragState.current = {
      isDragging: true,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.isDragging) return;
    const dx = e.clientX - dragState.current.startMouseX;
    const dy = e.clientY - dragState.current.startMouseY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragState.current.moved = true;
    }
    const newX = Math.max(28, Math.min(window.innerWidth - 28, dragState.current.startPosX + dx));
    const newY = Math.max(28, Math.min(window.innerHeight - 28, dragState.current.startPosY + dy));
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    dragState.current.isDragging = false;
  };

  if (!initialized) return null;

  // Position chat panel: prefer upper-left of sticker, clamp to viewport
  const PANEL_W = 340;
  const PANEL_H = 480;
  const GAP = 14;
  let panelLeft = pos.x - PANEL_W - GAP;
  let panelTop = pos.y - PANEL_H;
  if (panelLeft < 8) panelLeft = Math.min(pos.x + 56 + GAP, window.innerWidth - PANEL_W - 8);
  if (panelTop < 8) panelTop = 8;
  panelLeft = Math.max(8, Math.min(panelLeft, window.innerWidth - PANEL_W - 8));
  panelTop = Math.max(8, Math.min(panelTop, window.innerHeight - PANEL_H - 8));

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="agent-panel"
          style={{ left: panelLeft, top: panelTop }}
        >
          {/* Header */}
          <div className="agent-panel-header">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-doom-primary" />
              <span className="text-sm font-bold text-doom-text">
                WellBeing Agent
              </span>
              {profileLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-doom-primary" />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-doom-muted hover:text-doom-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="agent-messages">
            {profileLoading ? (
              <div className="agent-status">
                <Loader2 className="w-4 h-4 animate-spin text-doom-primary" />
                <span>Building your profile…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="agent-welcome">
                <Bot className="w-8 h-8 text-doom-primary mx-auto mb-3" />
                <p className="font-semibold">Hey there!</p>
                <p className="text-xs mt-1 text-doom-muted">
                  I know your health habits. Ask me anything about fitness,
                  nutrition, restaurants, skin or hair care.
                </p>
              </div>
            ) : null}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user" ? "agent-msg-user" : "agent-msg-bot"
                }
              >
                {msg.content}
              </div>
            ))}

            {sending && (
              <div className="agent-status">
                <Loader2 className="w-3 h-3 animate-spin text-doom-primary" />
                <span>Thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="agent-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              placeholder={
                profileLoading ? "Building profile…" : "Ask anything…"
              }
              disabled={profileLoading || sending}
              className="agent-input"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || profileLoading || sending}
              className="agent-send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Draggable Sticker */}
      <div
        className={`agent-sticker${isOpen ? " agent-sticker--open" : ""}`}
        style={{ left: pos.x - 28, top: pos.y - 28 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleStickerClick}
        title="WellBeing Agent"
      >
        <Bot className="w-6 h-6" />
        {!isOpen && <span className="agent-pulse" />}
      </div>
    </>
  );
}
