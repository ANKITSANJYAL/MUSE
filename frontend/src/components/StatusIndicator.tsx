"use client";

import React from "react";
import type { SessionState } from "@/hooks/useWebSocket";

interface StatusIndicatorProps {
    state: SessionState;
}

const CONFIG: Record<SessionState, { label: string; color: string; icon: React.ReactNode }> = {
    disconnected: {
        label: "Disconnected",
        color: "var(--text-muted)",
        icon: (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        ),
    },
    active: {
        label: "Active",
        color: "var(--accent-emerald)",
        icon: (
            <span className="animate-pulse-glow" style={{ display: "inline-flex" }}>
                <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="5" fill="currentColor" />
                </svg>
            </span>
        ),
    },
    listening: {
        label: "Listening",
        color: "var(--accent-cyan)",
        icon: (
            <span className="waveform-bars">
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
                <span className="waveform-bar" />
            </span>
        ),
    },
    thinking: {
        label: "Thinking",
        color: "var(--accent-purple)",
        icon: (
            <svg
                className="animate-spin-slow"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
            >
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6" />
            </svg>
        ),
    },
    error: {
        label: "Error",
        color: "#ef4444",
        icon: (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 10H1L6 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <line x1="6" y1="5" x2="6" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
            </svg>
        ),
    },
};

export default function StatusIndicator({ state }: StatusIndicatorProps) {
    const { label, color, icon } = CONFIG[state];

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "var(--radius-xl)",
                border: `1px solid ${color}33`,
                background: `${color}0d`,
                color,
                fontSize: "13px",
                fontWeight: 500,
                transition: "all 0.3s ease",
            }}
        >
            {icon}
            {label}
        </div>
    );
}
