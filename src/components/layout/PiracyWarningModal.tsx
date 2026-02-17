import { useState } from "react";
import { X } from "lucide-react";

export function PiracyWarningModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#121212",
          borderRadius: 15,
          border: "1.5px solid #FF4D4D",
          boxShadow: "0 0 30px rgba(255,77,77,0.4), 0 0 60px rgba(255,77,77,0.15)",
          maxWidth: 520,
          width: "100%",
          padding: "28px 24px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fff",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            color: "#888",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 28, marginBottom: 6 }}>⚠️</p>
          <h2
            style={{
              color: "#FF4D4D",
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            ⚠️ Você está usando uma extensão pirateada!
            <br />
            <span style={{ fontSize: 14, fontWeight: 600 }}>(seus projetos correm perigo)</span>
          </h2>
        </div>

        {/* Subtitle */}
        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#ccc",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Adquira sua versão oficial com{" "}
          <span style={{ color: "#00FF88", fontWeight: 700 }}>50% de desconto</span> e fuja da
          pirataria!
        </p>

        {/* Banner placeholder */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            borderRadius: 10,
            padding: "18px 14px",
            textAlign: "center",
            marginBottom: 20,
            border: "1px solid #333",
          }}
        >
          <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 6px" }}>
            Planos Alt Community #2026
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#00FF88",
              margin: 0,
            }}
          >
            🎯 50% OFF — Rankito IA
          </p>
          <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0" }}>
            Acesse todos os recursos premium com segurança
          </p>
        </div>

        {/* Discord button */}
        <a
          href="https://discord.gg/altcommunity"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            background: "#5865F2",
            color: "#fff",
            textAlign: "center",
            padding: "12px 0",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            marginBottom: 4,
          }}
        >
          💬 Entrar no Discord Oficial
        </a>
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#666",
            margin: "0 0 14px",
            userSelect: "all",
          }}
        >
          https://discord.gg/altcommunity
        </p>

        {/* WhatsApp button */}
        <a
          href="https://wa.me/5547984951601"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            background: "transparent",
            color: "#fff",
            textAlign: "center",
            padding: "12px 0",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            border: "1.5px solid #444",
            marginBottom: 4,
          }}
        >
          📱 Falar no WhatsApp
        </a>
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#666",
            margin: "0 0 20px",
            userSelect: "all",
          }}
        >
          +55 47 98495-1601
        </p>

        {/* Footer warning */}
        <div
          style={{
            background: "rgba(255,77,77,0.12)",
            border: "1px solid rgba(255,77,77,0.35)",
            borderRadius: 8,
            padding: "10px 14px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: "#FF4D4D",
            }}
          >
            💀 Quem te enviou essa extensão é um <span style={{ textDecoration: "underline" }}>GOLPISTA</span>! 💀
          </p>
        </div>
      </div>
    </div>
  );
}
