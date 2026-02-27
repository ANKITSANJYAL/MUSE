"use client";

import React, { useState, useRef, useCallback } from "react";

interface ControlBarProps {
    micActive: boolean;
    cameraActive: boolean;
    connected: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onSendText: (text: string) => void;
}

export default function ControlBar({
    micActive,
    cameraActive,
    connected,
    onToggleMic,
    onToggleCamera,
    onConnect,
    onDisconnect,
    onSendText,
}: ControlBarProps) {
    const [textInput, setTextInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const trimmed = textInput.trim();
            if (trimmed && connected) {
                onSendText(trimmed);
                setTextInput("");
            }
        },
        [textInput, connected, onSendText]
    );

    return (
        <div
            className="glass-panel-elevated"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
            }}
        >
            {/* Connect / Disconnect */}
            {!connected ? (
                <button
                    className="btn-primary"
                    onClick={onConnect}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        whiteSpace: "nowrap",
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                            d="M8 3V13M3 8H13"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                    Start Session
                </button>
            ) : (
                <button
                    className="btn-icon danger"
                    onClick={onDisconnect}
                    title="End Session"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="5" y="5" width="8" height="8" rx="1" fill="currentColor" />
                    </svg>
                </button>
            )}

            {/* Mic toggle */}
            <button
                className={`btn-icon ${micActive ? "active" : ""}`}
                onClick={onToggleMic}
                disabled={!connected}
                style={{ opacity: connected ? 1 : 0.4 }}
                title={micActive ? "Mute Microphone (M)" : "Unmute Microphone (M)"}
            >
                {micActive ? (
                    /* Mic on icon */
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="7" y="2" width="6" height="10" rx="3" fill="currentColor" />
                        <path
                            d="M4 9C4 12.3137 6.68629 15 10 15C13.3137 15 16 12.3137 16 9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <line x1="10" y1="15" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                ) : (
                    /* Mic off icon */
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <path
                            d="M4 9C4 12.3137 6.68629 15 10 15C13.3137 15 16 12.3137 16 9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <line x1="10" y1="15" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                )}
            </button>

            {/* Camera toggle */}
            <button
                className={`btn-icon ${cameraActive ? "active" : ""}`}
                onClick={onToggleCamera}
                disabled={!connected}
                style={{ opacity: connected ? 1 : 0.4 }}
                title={cameraActive ? "Turn Off Camera (C)" : "Turn On Camera (C)"}
            >
                {cameraActive ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="2" y="5" width="12" height="10" rx="2" fill="currentColor" />
                        <path d="M14 8L18 5.5V14.5L14 12V8Z" fill="currentColor" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="2" y="5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M14 8L18 5.5V14.5L14 12V8Z" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="2" y1="3" x2="18" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                )}
            </button>

            {/* Divider */}
            <div
                style={{
                    width: "1px",
                    height: "28px",
                    background: "var(--border-subtle)",
                    flexShrink: 0,
                }}
            />

            {/* Text input */}
            <form
                onSubmit={handleSubmit}
                style={{
                    flex: 1,
                    display: "flex",
                    gap: "8px",
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={
                        connected
                            ? "Type a message to Muse…"
                            : "Connect to start a session…"
                    }
                    disabled={!connected}
                    style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        outline: "none",
                        transition: "border-color 0.2s",
                        opacity: connected ? 1 : 0.5,
                    }}
                    onFocus={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = "var(--accent-purple)";
                    }}
                    onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = "var(--border-subtle)";
                    }}
                />
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={!connected || !textInput.trim()}
                    style={{
                        opacity: connected && textInput.trim() ? 1 : 0.4,
                        padding: "10px 16px",
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                            d="M2 8L14 2L8 14L7 9L2 8Z"
                            fill="currentColor"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </form>

            {/* Keyboard hints */}
            {connected && (
                <div
                    style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        display: "flex",
                        gap: "6px",
                    }}
                >
                    <kbd
                        style={{
                            padding: "2px 5px",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-surface)",
                            fontSize: "10px",
                        }}
                    >
                        M
                    </kbd>
                    mic
                    <kbd
                        style={{
                            padding: "2px 5px",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-surface)",
                            fontSize: "10px",
                        }}
                    >
                        C
                    </kbd>
                    cam
                </div>
            )}
        </div>
    );
}
