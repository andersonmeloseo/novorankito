import { useState } from "react";
import { AlertTriangle, Skull, X, MessageCircle } from "lucide-react";

const PiracyWarningModal = () => {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      style={{ zIndex: 2147483647 }}
      className="fixed inset-0 flex items-center justify-center p-md"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-auto animate-scale-in overflow-hidden"
        style={{
          background: "#121212",
          borderRadius: 15,
          border: "1.5px solid #FF4D4D",
          boxShadow:
            "0 0 30px rgba(255, 77, 77, 0.35), 0 0 60px rgba(255, 77, 77, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1 rounded-full transition-colors hover:bg-white/10"
          style={{ color: "#999" }}
        >
          <X size={18} />
        </button>

        <div className="p-lg space-y-lg">
          {/* Title */}
          <div className="flex items-start gap-sm">
            <AlertTriangle
              size={28}
              style={{ color: "#FF4D4D", flexShrink: 0, marginTop: 2 }}
            />
            <h2
              className="font-display font-bold leading-tight"
              style={{ color: "#FF4D4D", fontSize: "1.25rem" }}
            >
              ⚠️ Você está usando uma extensão pirateada!{" "}
              <span style={{ color: "#ccc", fontWeight: 400, fontSize: "0.9rem" }}>
                (seus projetos correm perigo)
              </span>
            </h2>
          </div>

          {/* Body Text */}
          <p style={{ color: "#ddd", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Adquira sua versão oficial com{" "}
            <span
              style={{
                color: "#00FF88",
                fontWeight: 700,
                textShadow: "0 0 8px rgba(0,255,136,0.3)",
              }}
            >
              50% de desconto
            </span>{" "}
            e fuja da pirataria!
          </p>

          {/* Banner Placeholder */}
          <div
            className="rounded-md overflow-hidden flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #1a1a2e, #16213e)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "24px 16px",
            }}
          >
            <div className="text-center">
              <p
                className="font-display font-bold"
                style={{ color: "#fff", fontSize: "1.1rem" }}
              >
                Planos Alt Community #2026
              </p>
              <p style={{ color: "#00FF88", fontSize: "0.8rem", marginTop: 4 }}>
                Versão oficial • Suporte premium • Atualizações garantidas
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-md">
            {/* Discord */}
            <div>
              <a
                href="https://discord.gg/altcommunity"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-sm w-full py-3 rounded-md font-semibold transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "#5865F2",
                  color: "#fff",
                  fontSize: "0.9rem",
                }}
              >
                <svg width="20" height="15" viewBox="0 0 71 55" fill="currentColor">
                  <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A39 39 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.1 59.1 0 00.4 44.6a.3.3 0 00.1.2 58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.8 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.6 58.6 0 0070 44.8a.3.3 0 00.1-.2c1.6-16.6-2.7-31-11.3-43.8a.2.2 0 00-.1-.1zM23.7 36.7c-3.8 0-6.9-3.5-6.9-7.7s3-7.7 6.9-7.7c3.9 0 7 3.5 6.9 7.7 0 4.3-3 7.7-6.9 7.7zm25.5 0c-3.8 0-6.9-3.5-6.9-7.7s3-7.7 6.9-7.7c3.9 0 7 3.5 6.9 7.7 0 4.3-3 7.7-6.9 7.7z" />
                </svg>
                Entrar no Discord
              </a>
              <p
                className="text-center mt-1 select-all cursor-pointer"
                style={{ color: "#666", fontSize: "0.75rem" }}
              >
                https://discord.gg/altcommunity
              </p>
            </div>

            {/* WhatsApp */}
            <div>
              <a
                href="https://wa.me/5547984951601"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-sm w-full py-3 rounded-md font-semibold transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "transparent",
                  color: "#ddd",
                  fontSize: "0.9rem",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }}
              >
                <MessageCircle size={18} />
                Falar no WhatsApp
              </a>
              <p
                className="text-center mt-1 select-all cursor-pointer"
                style={{ color: "#666", fontSize: "0.75rem" }}
              >
                +55 47 98495-1601
              </p>
            </div>
          </div>

          {/* Footer Warning */}
          <div
            className="flex items-center justify-center gap-sm py-3 rounded-md"
            style={{
              background: "rgba(255, 77, 77, 0.12)",
              border: "1px solid rgba(255, 77, 77, 0.25)",
            }}
          >
            <Skull size={18} style={{ color: "#FF4D4D" }} />
            <p
              className="font-semibold text-center"
              style={{ color: "#FF4D4D", fontSize: "0.8rem" }}
            >
              Quem te enviou essa extensão é um GOLPISTA!
            </p>
            <Skull size={18} style={{ color: "#FF4D4D" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PiracyWarningModal;
