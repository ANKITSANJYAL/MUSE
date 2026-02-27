"use client";

import React, { useState } from "react";
import type { GeneratedImage } from "@/hooks/useWebSocket";

interface CanvasPanelProps {
    images: GeneratedImage[];
    loadingPrompts: string[];
}

function ImageCard({
    img,
    onClick,
}: {
    img: GeneratedImage;
    onClick: () => void;
}) {
    return (
        <div
            className="animate-fade-in-up"
            style={{
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                cursor: "pointer",
                transition: "all 0.3s ease",
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-purple)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-glow-purple)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
        >
            <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                <img
                    src={`data:image/png;base64,${img.data}`}
                    alt={img.prompt}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            </div>
            <div
                style={{
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.4",
                }}
            >
                {img.prompt.length > 80 ? img.prompt.slice(0, 80) + "…" : img.prompt}
            </div>
        </div>
    );
}

function LoadingSkeleton({ prompt }: { prompt: string }) {
    return (
        <div
            className="animate-fade-in-up"
            style={{
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
            }}
        >
            <div
                className="animate-shimmer"
                style={{ aspectRatio: "16/9" }}
            />
            <div
                style={{
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "var(--accent-purple)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                }}
            >
                <svg
                    className="animate-spin-slow"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                >
                    <circle
                        cx="6"
                        cy="6"
                        r="4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                    />
                </svg>
                {prompt.length > 60 ? prompt.slice(0, 60) + "…" : prompt}
            </div>
        </div>
    );
}

// ── Lightbox ──

function Lightbox({
    img,
    onClose,
}: {
    img: GeneratedImage;
    onClose: () => void;
}) {
    return (
        <div
            className="animate-fade-in-up"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(8px)",
                cursor: "pointer",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    maxWidth: "90vw",
                    maxHeight: "90vh",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-elevated)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={`data:image/png;base64,${img.data}`}
                    alt={img.prompt}
                    style={{
                        maxWidth: "90vw",
                        maxHeight: "80vh",
                        objectFit: "contain",
                        display: "block",
                    }}
                />
                <div
                    style={{
                        background: "var(--bg-surface)",
                        padding: "14px 20px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        borderTop: "1px solid var(--border-subtle)",
                    }}
                >
                    {img.prompt}
                </div>
            </div>
        </div>
    );
}

// ── Main component ──

export default function CanvasPanel({ images, loadingPrompts }: CanvasPanelProps) {
    const [lightboxImg, setLightboxImg] = useState<GeneratedImage | null>(null);

    return (
        <>
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
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: "var(--accent-pink)" }}>
                        <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 13L6 9L9 12L12 8L16 13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    <span
                        style={{
                            fontFamily: "Outfit, sans-serif",
                            fontWeight: 600,
                            fontSize: "15px",
                        }}
                    >
                        Creative Canvas
                    </span>
                    <span
                        style={{
                            marginLeft: "auto",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                        }}
                    >
                        {images.length} images
                    </span>
                </div>

                {/* Grid */}
                <div
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: "16px",
                    }}
                >
                    {images.length === 0 && loadingPrompts.length === 0 ? (
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
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.2 }}>
                                <rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M16 32L22 24L26 28L32 20L40 32" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                            <span>
                                Generated visuals will appear here
                                <br />
                                as Muse creates your storyboard
                            </span>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                                gap: "14px",
                            }}
                        >
                            {loadingPrompts.map((prompt, i) => (
                                <LoadingSkeleton key={`loading-${i}`} prompt={prompt} />
                            ))}
                            {images
                                .slice()
                                .reverse()
                                .map((img) => (
                                    <ImageCard
                                        key={img.id}
                                        img={img}
                                        onClick={() => setLightboxImg(img)}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {lightboxImg && (
                <Lightbox img={lightboxImg} onClose={() => setLightboxImg(null)} />
            )}
        </>
    );
}
