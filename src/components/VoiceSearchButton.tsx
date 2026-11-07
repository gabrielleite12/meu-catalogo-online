"use client";
import { useState, useEffect, useRef } from "react";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  className?: string;
  title?: string;
}

export default function VoiceSearchButton({
  onTranscript,
  onFinalTranscript,
  className = "",
  title = "Pesquisar por voz",
}: VoiceSearchButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasDispatchedRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    } catch (e) {
      console.warn("Error stopping recognition:", e);
    }
    setListening(false);
    setStatusText(null);
  };

  const startListening = async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Seu navegador não possui suporte nativo a reconhecimento de voz direto. Recomendamos o Google Chrome ou Microsoft Edge."
      );
      return;
    }

    if (!window.isSecureContext) {
      alert(
        "Atenção: O navegador exige uma conexão segura (HTTPS ou http://localhost:3000) para liberar o microfone. Se estiver acessando pelo IP local (ex: 192.168.x.x), use http://localhost:3000."
      );
      return;
    }

    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
    } catch (err: any) {
      console.error("Permissão de microfone negada:", err);
      alert(
        "Permissão de microfone negada ou não encontrada. Por favor, clique no ícone de configurações/cadeado na barra de endereços do navegador e permita o uso do Microfone."
      );
      return;
    }

    hasDispatchedRef.current = false;
    latestTranscriptRef.current = "";

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setStatusText("Ouvindo... Fale agora");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          latestTranscriptRef.current = currentText;
          onTranscript(currentText);
        }

        // Se o navegador já marcou como final, para o microfone
        if (finalTranscript && !hasDispatchedRef.current) {
          hasDispatchedRef.current = true;
          stopListening();
          if (onFinalTranscript) {
            onFinalTranscript(finalTranscript.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        stopListening();

        if (event.error === "not-allowed" || event.error === "permission-denied") {
          alert(
            "Acesso ao microfone foi bloqueado. Por favor, permita o microfone no ícone de cadeado na barra do navegador (ao lado de localhost:3000)."
          );
        } else if (event.error === "network") {
          alert(
            "Erro de conexão com o serviço de voz. Verifique sua conexão com a internet ou utilize o Google Chrome."
          );
        } else if (event.error === "no-speech") {
          // silêncio detectado
        } else if (event.error !== "aborted") {
          alert(`Aviso no microfone (${event.error}). Tente novamente.`);
        }
      };

      recognition.onend = () => {
        stopListening();
        // Se ainda não despachou e temos algum texto acumulado, envia apenas UMA vez
        if (!hasDispatchedRef.current && latestTranscriptRef.current && onFinalTranscript) {
          hasDispatchedRef.current = true;
          const text = latestTranscriptRef.current;
          latestTranscriptRef.current = "";
          onFinalTranscript(text);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Erro ao iniciar reconhecimento:", err);
      stopListening();
      alert("Não foi possível iniciar o microfone. Erro: " + (err?.message || err));
    }
  };

  const toggleListen = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <button
      type="button"
      onClick={mounted ? toggleListen : undefined}
      className={`voice-search-btn ${listening ? "listening" : ""} ${className}`}
      title={listening ? "Ouvindo... Clique para parar" : title}
      aria-label={listening ? "Ouvindo... Clique para parar" : title}
      style={{ position: "relative" }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={listening ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      {listening && <span className="voice-pulse" />}

      {listening && (
        <span
          className="voice-status-tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            background: "#ef4444",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          {statusText || "Ouvindo..."}
        </span>
      )}
    </button>
  );
}
