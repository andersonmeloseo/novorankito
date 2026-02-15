import { useState } from "react";
import { X } from "lucide-react";

const PiracyWarningPopup = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#121212",
          borderRadius: "15px",
          border: "2px solid #FF4D4D",
          boxShadow: "0 0 30px rgba(255,77,77,0.4), 0 0 60px rgba(255,77,77,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
          maxWidth: "520px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "32px 28px",
          position: "relative",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "#fff",
        }}
      >
        {/* Close */}
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "8px",
            color: "#aaa",
            cursor: "pointer",
            padding: "6px",
            display: "flex",
          }}
        >
          <X size={18} />
        </button>

        {/* Warning icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h2
            style={{
              color: "#FF4D4D",
              fontSize: "20px",
              fontWeight: 800,
              lineHeight: 1.3,
              margin: 0,
              textShadow: "0 0 20px rgba(255,77,77,0.3)",
            }}
          >
            Você está usando uma extensão pirateada!
            <br />
            <span style={{ fontSize: "15px", fontWeight: 600 }}>(seus projetos correm perigo)</span>
          </h2>
        </div>

        {/* Subtitle */}
        <p
          style={{
            textAlign: "center",
            fontSize: "15px",
            color: "#ccc",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Adquira sua versão oficial com{" "}
          <span style={{ color: "#00FF88", fontWeight: 700, fontSize: "17px" }}>
            50% de desconto
          </span>{" "}
          e fuja da pirataria!
        </p>

        {/* Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "20px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "13px", color: "#aaa", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
            Planos Alt Community
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#fff", marginBottom: "4px" }}>
            #2026
          </div>
          <div style={{ fontSize: "14px", color: "#00FF88", fontWeight: 600 }}>
            Acesso oficial • Suporte prioritário • Atualizações
          </div>
        </div>

        {/* Discord Button */}
        <a
          href="https://discord.gg/altcommunity"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "#5865F2",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "none",
            width: "100%",
            marginBottom: "6px",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(88,101,242,0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Entrar no Discord
        </a>
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#5865F2",
            marginBottom: "16px",
            userSelect: "all",
            cursor: "text",
          }}
        >
          https://discord.gg/altcommunity
        </div>

        {/* WhatsApp Button */}
        <a
          href="https://wa.me/5547984951601"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "transparent",
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: "10px",
            padding: "13px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "none",
            width: "100%",
            marginBottom: "6px",
            transition: "border-color 0.15s, transform 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "#25D366";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .611.611l4.458-1.495A11.932 11.932 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 0 1-5.39-1.583l-.386-.232-2.651.889.889-2.651-.232-.386A9.94 9.94 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          Falar no WhatsApp
        </a>
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#888",
            marginBottom: "24px",
            userSelect: "all",
            cursor: "text",
          }}
        >
          +55 47 98495-1601
        </div>

        {/* Footer warning */}
        <div
          style={{
            background: "rgba(255,77,77,0.12)",
            border: "1px solid rgba(255,77,77,0.3)",
            borderRadius: "10px",
            padding: "14px 18px",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: 700,
            color: "#FF4D4D",
          }}
        >
          💀 Quem te enviou essa extensão é um <span style={{ textDecoration: "underline" }}>GOLPISTA!</span> 💀
        </div>
      </div>
    </div>
  );
};

export default PiracyWarningPopup;
