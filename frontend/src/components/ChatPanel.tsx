"use client";

import React, { useEffect, useRef } from "react";
import type { TranscriptMessage } from "@/hooks/useWebSocket";

interface ChatPanelProps {
    messages: TranscriptMessage[];
}

function MessageBubble({ msg }: { msg: TranscriptMessage }) {
    const isUser = msg.role === "user";
    const isSystem = msg.role === "system";

    return (
        <div
            className="animate-fade-in-up"
            style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: "12px",
            }}
        >
            <div
                style={{
                    maxWidth: "85%",
                    padding: "10px 16px",
                    borderRadius: isUser
                        ? "var(--radius-md) var(--radius-md) 4px var(--radius-md)"
                        : "var(--radius-md) var(--radius-md) var(--radius-md) 4px",
                    background: isUser
                        ? "var(--gradient-primary)"
                        : isSystem
                            ? "rgba(245, 158, 11, 0.1)"
                            : "var(--bg-elevated)",
                    border: isSystem
                        ? "1px solid rgba(245, 158, 11, 0.2)"
                        : isUser
                            ? "none"
                            : "1px solid var(--border-subtle)",
                    color: isSystem ? "var(--accent-amber)" : "var(--text-primary)",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    wordBreak: "break-word",
                }}
            >
                {!isUser && !isSystem && (
                    <div
                        style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--accent-purple)",
                            marginBottom: "4px",
                            fontFamily: "Outfit, sans-serif",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        Muse
                    </div>
                )}
                {msg.text}
            </div>
        </div>
    );
}

export default function ChatPanel({ messages }: ChatPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div
            className="glass-panel"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                }}
            >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: "var(--accent-cyan)" }}>
                    <path
                        d="M3 5C3 3.89543 3.89543 3 5 3H13C14.1046 3 15 3.89543 15 5V11C15 12.1046 14.1046 13 13 13H7L4 15.5V13H5H3V5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
                <span
                    style={{
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: 600,
                        fontSize: "15px",
                    }}
                >
                    Conversation
                </span>
                <span
                    style={{
                        marginLeft: "auto",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                    }}
                >
                    {messages.length} messages
                </span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "16px 20px",
                }}
            >
                {messages.length === 0 ? (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "var(--text-muted)",
                            fontSize: "14px",
                            textAlign: "center",
                            gap: "12px",
                        }}
                    >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.3 }}>
                            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M14 18C14 16.8954 14.8954 16 16 16H24C25.1046 16 26 16.8954 26 18V22C26 23.1046 25.1046 24 24 24H18L15 26.5V24H16H14V18Z" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span>Start speaking or type a message<br />to begin your creative session</span>
                    </div>
                ) : (
                    messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
            </div>
        </div>
    );
}
