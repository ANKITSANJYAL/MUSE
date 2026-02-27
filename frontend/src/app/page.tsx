"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import StatusIndicator from "@/components/StatusIndicator";
import ChatPanel from "@/components/ChatPanel";
import CanvasPanel from "@/components/CanvasPanel";
import ControlBar from "@/components/ControlBar";
import {
  useWebSocket,
  type TranscriptMessage,
  type GeneratedImage,
  type SessionState,
} from "@/hooks/useWebSocket";
import { useMediaCapture } from "@/hooks/useMediaCapture";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export default function Home() {
  // ── State ──
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Audio playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // ── Audio playback engine ──
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const buffer = audioQueueRef.current.shift()!;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const ctx = audioContextRef.current;
      const int16 = new Int16Array(buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
    }

    isPlayingRef.current = false;
  }, []);

  // ── WebSocket callbacks ──
  const handleAudio = useCallback(
    (pcmBase64: string) => {
      const binary = atob(pcmBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      audioQueueRef.current.push(bytes.buffer);
      playNextAudio();
    },
    [playNextAudio]
  );

  const handleTranscript = useCallback((msg: TranscriptMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleImage = useCallback((img: GeneratedImage) => {
    setImages((prev) => [...prev, img]);
    // Remove from loading
    setLoadingPrompts((prev) => prev.filter((p) => p !== img.prompt));
  }, []);

  const handleImageLoading = useCallback((prompt: string) => {
    setLoadingPrompts((prev) => [...prev, prompt]);
  }, []);

  const handleStatus = useCallback((_state: SessionState) => {
    // Status is tracked internally by the hook
  }, []);

  const handleError = useCallback((message: string) => {
    setErrors((prev) => [...prev, message]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setErrors((prev) => prev.slice(1));
    }, 5000);
  }, []);

  const {
    connectionStatus,
    sessionState,
    connect,
    disconnect,
    sendAudio,
    sendVideo,
    sendText,
  } = useWebSocket({
    url: WS_URL,
    onAudio: handleAudio,
    onTranscript: handleTranscript,
    onImage: handleImage,
    onImageLoading: handleImageLoading,
    onStatus: handleStatus,
    onError: handleError,
  });

  // ── Media capture ──
  const {
    micActive,
    cameraActive,
    toggleMicrophone,
    toggleCamera,
  } = useMediaCapture({
    onAudioChunk: sendAudio,
    onVideoFrame: sendVideo,
    videoFrameIntervalMs: 1000,
  });

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "m" || e.key === "M") {
        if (connectionStatus === "connected") toggleMicrophone();
      }
      if (e.key === "c" || e.key === "C") {
        if (connectionStatus === "connected") toggleCamera();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [connectionStatus, toggleMicrophone, toggleCamera]);

  const isConnected = connectionStatus === "connected";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Logo */}
          <div
            className="animate-gradient"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              background: "var(--gradient-creative)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Outfit, sans-serif",
              fontWeight: 800,
              fontSize: "18px",
              color: "white",
            }}
          >
            M
          </div>
          <div>
            <h1
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 700,
                fontSize: "18px",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              <span className="text-gradient">Project Muse</span>
            </h1>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              Creative Director AI · Storyboard Engine
            </p>
          </div>
        </div>

        <StatusIndicator state={sessionState} />
      </header>

      {/* ── Error toast ── */}
      {errors.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "72px",
            right: "24px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {errors.map((err, i) => (
            <div
              key={i}
              className="animate-fade-in-up"
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                fontSize: "13px",
                maxWidth: "320px",
              }}
            >
              {err}
            </div>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          padding: "12px",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <ChatPanel messages={messages} />
        <CanvasPanel images={images} loadingPrompts={loadingPrompts} />
      </main>

      {/* ── Control bar ── */}
      <div style={{ padding: "0 12px 12px", flexShrink: 0 }}>
        <ControlBar
          micActive={micActive}
          cameraActive={cameraActive}
          connected={isConnected}
          onToggleMic={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onConnect={connect}
          onDisconnect={disconnect}
          onSendText={sendText}
        />
      </div>
    </div>
  );
}
