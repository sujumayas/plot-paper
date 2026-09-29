"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h1>Something went wrong.</h1>
          <p>Your draft is saved in this browser.</p>
          <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
