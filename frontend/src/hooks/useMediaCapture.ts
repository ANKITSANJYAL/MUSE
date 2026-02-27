"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface UseMediaCaptureOptions {
    onAudioChunk?: (pcmBase64: string) => void;
    onVideoFrame?: (jpegBase64: string) => void;
    videoFrameIntervalMs?: number; // default: 1000 (1 FPS)
}

interface MediaCaptureState {
    micActive: boolean;
    cameraActive: boolean;
    micPermission: PermissionState | "unknown";
    cameraPermission: PermissionState | "unknown";
}

// ── AudioWorklet Processor (inline) ──────────────────────────────────────────

const AUDIO_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 4096; // ~256ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    // Convert float32 to int16
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
    }

    if (this._buffer.length >= this._bufferSize) {
      const int16 = new Int16Array(this._buffer.splice(0, this._bufferSize));
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMediaCapture({
    onAudioChunk,
    onVideoFrame,
    videoFrameIntervalMs = 1000,
}: UseMediaCaptureOptions) {
    const [state, setState] = useState<MediaCaptureState>({
        micActive: false,
        cameraActive: false,
        micPermission: "unknown",
        cameraPermission: "unknown",
    });

    // Refs for cleanup
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const frameIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // ── Microphone ──

    const startMicrophone = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            audioStreamRef.current = stream;

            // Create AudioContext at 16kHz
            const ctx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = ctx;

            // Register the AudioWorklet processor
            const blob = new Blob([AUDIO_WORKLET_CODE], { type: "application/javascript" });
            const workletUrl = URL.createObjectURL(blob);

            try {
                await ctx.audioWorklet.addModule(workletUrl);
            } finally {
                URL.revokeObjectURL(workletUrl);
            }

            const source = ctx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
                // Convert ArrayBuffer to base64
                const bytes = new Uint8Array(event.data);
                let binary = "";
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                onAudioChunk?.(base64);
            };

            source.connect(workletNode);
            workletNode.connect(ctx.destination); // needed for processing to run

            setState((s) => ({ ...s, micActive: true, micPermission: "granted" }));
        } catch (err) {
            console.error("Failed to start microphone:", err);
            setState((s) => ({ ...s, micPermission: "denied" }));
        }
    }, [onAudioChunk]);

    const stopMicrophone = useCallback(() => {
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((t) => t.stop());
            audioStreamRef.current = null;
        }
        setState((s) => ({ ...s, micActive: false }));
    }, []);

    const toggleMicrophone = useCallback(() => {
        if (state.micActive) {
            stopMicrophone();
        } else {
            startMicrophone();
        }
    }, [state.micActive, startMicrophone, stopMicrophone]);

    // ── Camera ──

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
            });

            videoStreamRef.current = stream;

            // Create hidden video element for frame capture
            const video = document.createElement("video");
            video.srcObject = stream;
            video.muted = true;
            video.playsInline = true;
            await video.play();
            videoRef.current = video;

            // Create canvas for JPEG encoding
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            canvasRef.current = canvas;

            // Capture frames at interval
            frameIntervalRef.current = setInterval(() => {
                if (!videoRef.current || !canvasRef.current) return;
                const ctx = canvasRef.current.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.7);
                // Strip data:image/jpeg;base64, prefix
                const base64 = dataUrl.split(",")[1];
                if (base64) onVideoFrame?.(base64);
            }, videoFrameIntervalMs);

            setState((s) => ({ ...s, cameraActive: true, cameraPermission: "granted" }));
        } catch (err) {
            console.error("Failed to start camera:", err);
            setState((s) => ({ ...s, cameraPermission: "denied" }));
        }
    }, [onVideoFrame, videoFrameIntervalMs]);

    const stopCamera = useCallback(() => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = undefined;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
            videoRef.current = null;
        }
        if (canvasRef.current) {
            canvasRef.current = null;
        }
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach((t) => t.stop());
            videoStreamRef.current = null;
        }
        setState((s) => ({ ...s, cameraActive: false }));
    }, []);

    const toggleCamera = useCallback(() => {
        if (state.cameraActive) {
            stopCamera();
        } else {
            startCamera();
        }
    }, [state.cameraActive, startCamera, stopCamera]);

    // ── Get camera stream for preview ──
    const getCameraStream = useCallback(() => {
        return videoStreamRef.current;
    }, []);

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => {
            stopMicrophone();
            stopCamera();
        };
    }, [stopMicrophone, stopCamera]);

    return {
        micActive: state.micActive,
        cameraActive: state.cameraActive,
        micPermission: state.micPermission,
        cameraPermission: state.cameraPermission,
        toggleMicrophone,
        toggleCamera,
        startMicrophone,
        stopMicrophone,
        startCamera,
        stopCamera,
        getCameraStream,
    };
}
