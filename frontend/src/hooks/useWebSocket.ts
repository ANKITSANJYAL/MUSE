"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface TranscriptMessage {
    id: string;
    text: string;
    role: "user" | "assistant" | "system";
    timestamp: number;
}

export interface GeneratedImage {
    id: string;
    data: string; // base64 PNG
    prompt: string;
    timestamp: number;
}

export type SessionState = "disconnected" | "active" | "listening" | "thinking" | "error";

export interface SceneMarkerEvent {
    kind: "start" | "end";
}

interface ServerMessage {
    type: string;
    data?: string;
    text?: string;
    role?: string;
    state?: SessionState;
    prompt?: string;
    mime_type?: string;
    message?: string;
    kind?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseWebSocketOptions {
    url: string;
    onAudio?: (pcmBase64: string) => void;
    onTranscript?: (msg: TranscriptMessage) => void;
    onImage?: (img: GeneratedImage) => void;
    onImageLoading?: (prompt: string) => void;
    onStatus?: (state: SessionState) => void;
    onSceneMarker?: (marker: SceneMarkerEvent) => void;
    onError?: (message: string) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000; // ms

let msgIdCounter = 0;
function nextId(): string {
    return `msg-${Date.now()}-${++msgIdCounter}`;
}

export function useWebSocket({
    url,
    onAudio,
    onTranscript,
    onImage,
    onImageLoading,
    onStatus,
    onSceneMarker,
    onError,
}: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [sessionState, setSessionState] = useState<SessionState>("disconnected");

    const clearReconnect = useCallback(() => {
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = undefined;
        }
    }, []);

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);

                switch (msg.type) {
                    case "audio":
                        if (msg.data) onAudio?.(msg.data);
                        break;

                    case "transcript":
                        if (msg.text) {
                            onTranscript?.({
                                id: nextId(),
                                text: msg.text,
                                role: (msg.role as TranscriptMessage["role"]) || "assistant",
                                timestamp: Date.now(),
                            });
                        }
                        break;

                    case "image":
                        if (msg.data && msg.prompt) {
                            onImage?.({
                                id: nextId(),
                                data: msg.data,
                                prompt: msg.prompt,
                                timestamp: Date.now(),
                            });
                        }
                        break;

                    case "image_loading":
                        if (msg.prompt) onImageLoading?.(msg.prompt);
                        break;

                    case "status":
                        if (msg.state) {
                            setSessionState(msg.state);
                            onStatus?.(msg.state);
                        }
                        break;

                    case "scene_marker":
                        if (msg.kind) {
                            onSceneMarker?.({ kind: msg.kind as "start" | "end" });
                        }
                        break;

                    case "error":
                        onError?.(msg.message || "Unknown error");
                        break;

                    default:
                        console.warn("Unknown message type:", msg.type);
                }
            } catch {
                console.error("Failed to parse WebSocket message");
            }
        },
        [onAudio, onTranscript, onImage, onImageLoading, onStatus, onSceneMarker, onError]
    );

    const connect = useCallback(() => {
        clearReconnect();

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setConnectionStatus("connecting");
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionStatus("connected");
            reconnectAttempts.current = 0;
        };

        ws.onmessage = handleMessage;

        ws.onerror = () => {
            setConnectionStatus("error");
            onError?.("WebSocket connection error");
        };

        ws.onclose = (event) => {
            wsRef.current = null;
            setConnectionStatus("disconnected");
            setSessionState("disconnected");

            // Auto-reconnect on abnormal close
            if (!event.wasClean && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current);
                reconnectAttempts.current++;
                reconnectTimer.current = setTimeout(() => connect(), delay);
            }
        };
    }, [url, handleMessage, clearReconnect, onError]);

    const disconnect = useCallback(() => {
        clearReconnect();
        reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // prevent auto-reconnect

        if (wsRef.current) {
            // Send disconnect control message
            try {
                wsRef.current.send(JSON.stringify({ type: "control", action: "disconnect" }));
            } catch { /* ignore */ }
            wsRef.current.close(1000, "User disconnected");
            wsRef.current = null;
        }
        setConnectionStatus("disconnected");
        setSessionState("disconnected");
    }, [clearReconnect]);

    const sendAudio = useCallback((pcmBase64: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "audio_data", data: pcmBase64 }));
        }
    }, []);

    const sendVideo = useCallback((jpegBase64: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "video_frame", data: jpegBase64 }));
        }
    }, []);

    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "text_message", text }));
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearReconnect();
            if (wsRef.current) {
                wsRef.current.close(1000, "Component unmounted");
                wsRef.current = null;
            }
        };
    }, [clearReconnect]);

    return {
        connectionStatus,
        sessionState,
        connect,
        disconnect,
        sendAudio,
        sendVideo,
        sendText,
    };
}
