"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import VoiceSearchButton from "@/components/VoiceSearchButton";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
}

export default function GlobalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Olá! 👋 Sou a Aprile, sua assistente de busca do Vitrine Zap. Me diga o que você está procurando (roupas, calçados, produtos ou sua cidade) e te indico as melhores lojas!",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Abre a Aprile quando solicitado pelo menu tipo app
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("vz-open-agent", handleOpen);
    return () => window.removeEventListener("vz-open-agent", handleOpen);
  }, []);

  const handleSend = async (customText?: string) => {
    const textToSend = customText ?? input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-5).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao consultar assistente");

      setMessages((prev) => [
        ...prev,
        {
          id: "b_" + Date.now(),
          sender: "bot",
          text: data.reply || "Aqui estão as lojas que encontrei:",
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          sender: "bot",
          text: "Não foi possível carregar a resposta no momento. Pode tentar de novo?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="chatbot-launcher global-launcher"
          aria-label="Falar com Aprile - Vitrine Zap"
        >
          <div className="chatbot-launcher-avatar global-vz-avatar">
            <span className="vz-logo-text">VZ</span>
          </div>
          <span className="chatbot-launcher-badge">IA</span>
          <span className="chatbot-launcher-text">Aprile · Busca IA</span>
          <span className="beta-badge">BETA</span>
        </button>
      )}

      {/* Janela de Chat */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar global global-vz-avatar">
                <span className="vz-logo-text">VZ</span>
              </div>
              <div>
                <strong>Aprile <span className="beta-badge">BETA</span></strong>
                <span className="chatbot-header-status">
                  <span className="status-dot" /> Vitrine Zap · Assistente Oficial
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="chatbot-close-btn"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chatbot-msg ${m.sender}`}>
                <div className="chatbot-bubble">
                  <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg bot">
                <div className="chatbot-bubble typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-bar">
            <VoiceSearchButton
              className="chatbot-tool-btn chatbot-voice-btn"
              title="Falar por voz (envia direto para a Aprile)"
              onTranscript={(text) => {
                setInput(text);
              }}
              onFinalTranscript={(finalText) => {
                setInput("");
                handleSend(finalText);
              }}
            />

            <input
              type="text"
              placeholder="Ex: Procuro tênis na minha cidade..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />

            <button
              type="button"
              className="chatbot-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
