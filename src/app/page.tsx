/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";


export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      // Allow the DOM to swap from splash to main, then fade in
      setTimeout(() => setRevealed(true), 30);
    }, 2500); // Show splash for 2.5 seconds
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "black",
          transition: "opacity 1s ease",
        }}
      >
        <img
          src="/coach_logo.png"
          alt="Coach Tigo Logo"
          style={{
            width: "min(70%, 320px)",
            height: "auto",
            opacity: 0.95,
            animation: "fadeOut 1s ease-out 4s forwards",
          }}
        />
        <style jsx>{`
          @keyframes fadeOut {
            to {
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        color: "#ffffff",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        opacity: revealed ? 1 : 0,
        transition: "opacity 600ms ease",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
          filter: "brightness(0.7) saturate(1.1)",
        }}
      >
        <source src="tigo_intro.mp4" type="video/mp4" />
        {/* Fallback dif video can't play */}
      </video>

      {/* Dark gradient overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.75) 100%)",
          zIndex: 0,
        }}
      />

      {/* Content */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <img
          src="/coach_logo.png"
          alt="Coach Tigo Logo"
          style={{
            width: "min(60%, 280px)",
            height: "auto",
            marginBottom: "1.75rem",
            opacity: 0.9,
            filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.9)) contrast(1.1) brightness(1.1)",
            mixBlendMode: "multiply", // helps remove white background under dark conditions
          }}
        />

        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 56px)",
            fontWeight: 900,
            letterSpacing: "0.5px",
            margin: "0 0 0.75rem 0",
          }}
        >
          TIGO ATHLETICS
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2.5vw, 22px)",
            opacity: 0.92,
            marginBottom: "1.25rem",
          }}
        >
          Select your role
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/trainee/login"
            className="t-role-card"
            style={{
              padding: "0.9rem 1.4rem",
              borderRadius: "10px",
              fontWeight: 700,
              textDecoration: "none",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            Client
          </Link>

          <Link
            href="/trainer/login"
            className="t-role-card"
            style={{
              padding: "0.9rem 1.4rem",
              borderRadius: "10px",
              fontWeight: 700,
              textDecoration: "none",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            Trainer
          </Link>
        </div>

        {/* Language selector */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            gap: 8,
            fontWeight: 700,
            opacity: 0.95,
          }}
          aria-label="Language selector"
        >
          <a href="#" style={{ color: "#fff", textDecoration: "none" }}>EN</a>
          <span style={{ opacity: 0.7 }}>|</span>
          <a href="#" style={{ color: "#fff", textDecoration: "none" }}>FR</a>
          <span style={{ opacity: 0.7 }}>|</span>
          <a href="#" style={{ color: "#fff", textDecoration: "none" }}>ES</a>
        </div>
      </section>
    </main>
  );
}
