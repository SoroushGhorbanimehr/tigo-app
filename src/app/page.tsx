export default function Home() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        color: "#ffffff",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/TIGO_logo.png"
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
        <source src="tigo_vid.mp4" type="video/mp4" />
        {/* Fallback if video can't play */}
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
          src="/TIGO_logo.png"
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
          Welcome to Coach TIGO App!
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2.5vw, 22px)",
            opacity: 0.92,
          }}
        >
          Coming Soon!
        </p>
      </section>
    </main>
  );
}