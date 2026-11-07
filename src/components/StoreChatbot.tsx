"use client";
import { useState, useRef, useEffect } from "react";
import { useStoreCart } from "@/components/StoreCart";
import { brl, imgUrl, type Product } from "@/lib/utils";
import VoiceSearchButton from "@/components/VoiceSearchButton";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  image?: string;
  products?: Product[];
  actionApplied?: boolean;
}

interface StoreChatbotProps {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  products: Product[];
}

export default function StoreChatbot({ slug, storeName, logoUrl, products }: StoreChatbotProps) {
  const cart = useStoreCart();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: `Olá! Sou o assistente virtual da ${storeName} 🤖. Como posso ajudar? Você pode me perguntar sobre produtos, falar por áudio ou até me enviar a foto de uma peça que procura!`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Abre o assistente quando solicitado pelo menu tipo app
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("vz-open-agent", handleOpen);
    return () => window.removeEventListener("vz-open-agent", handleOpen);
  }, []);

  // Exibe toast temporário
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Converte imagem selecionada para base64
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Envia mensagem para a API NVIDIA
  const handleSend = async (customText?: string) => {
    const textToSend = customText ?? input;
    if (!textToSend.trim() && !imageFile) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
      image: imageFile || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const sentImage = imageFile;
    setImageFile(null);
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
          image: sentImage,
          slug,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao obter resposta da IA.");
      }

      // Executa ação automática no carrinho se houver
      let actionApplied = false;
      if (data.action?.type === "add_to_cart" && data.action.productId) {
        const prod = products.find((p) => p.id === data.action.productId);
        if (prod) {
          cart.add(prod, undefined, data.action.qty || 1);
          actionApplied = true;
          showToast(`🛍️ ${prod.name} adicionado ao seu carrinho!`);
        }
      }

      // Mapeia produtos sugeridos para renderizar mini-cards
      const suggestedProds = (data.products ?? []).length > 0
        ? data.products
        : data.action?.type === "suggest_products" && Array.isArray(data.action.productIds)
        ? products.filter((p) => data.action.productIds.includes(p.id))
        : undefined;

      const botMsg: ChatMessage = {
        id: "b_" + Date.now(),
        sender: "bot",
        text: data.reply || "Aqui está o que encontrei para você:",
        products: suggestedProds,
        actionApplied,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          sender: "bot",
          text: "Ops! Tive um problema ao processar seu pedido. Pode tentar novamente em instantes?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toast flutuante de confirmação */}
      {toast && (
        <div className="chatbot-toast" role="alert">
          {toast}
        </div>
      )}

      {/* Botão Flutuante (Launcher) no canto inferior */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="chatbot-launcher"
          aria-label="Abrir assistente virtual da loja"
        >
          <div className="chatbot-launcher-avatar">
            {logoUrl ? <img src={logoUrl} alt={storeName} /> : <span>{storeName[0]}</span>}
          </div>
          <span className="chatbot-launcher-badge">IA</span>
          <span className="chatbot-launcher-text">Atendente IA</span>
          <span className="beta-badge">BETA</span>
        </button>
      )}

      {/* Janela do Chatbot */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Cabeçalho */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar">
                {logoUrl ? <img src={logoUrl} alt={storeName} /> : <span>{storeName[0]}</span>}
              </div>
              <div>
                <strong>{storeName} <span className="beta-badge">BETA</span></strong>
                <span className="chatbot-header-status">
                  <span className="status-dot" /> Atendente Virtual Vitrine Zap
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="chatbot-close-btn"
              aria-label="Fechar chat"
            >
              ✕
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chatbot-msg ${m.sender}`}>
                {m.image && (
                  <div className="chatbot-msg-image-wrap">
                    <img src={m.image} alt="Enviada pelo cliente" />
                  </div>
                )}
                <div className="chatbot-bubble">
                  <p>{m.text}</p>

                  {/* Confirmação de ação aplicada */}
                  {m.actionApplied && (
                    <div className="chatbot-action-badge">
                      ✓ Adicionado ao carrinho automaticamente
                    </div>
                  )}

                  {/* Cards de produtos sugeridos com link para aba do produto e botão de compra */}
                  {m.products && m.products.length > 0 && (
                    <div className="chatbot-product-cards">
                      {m.products.map((p) => {
                        const firstImg = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
                        const prodUrl = `/${slug}/p/${p.id}`;
                        return (
                          <div key={p.id} className="chatbot-pcard">
                            <a
                              href={prodUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chatbot-pcard-img-link"
                              title="Abrir página do produto"
                            >
                              {firstImg ? (
                                <img src={imgUrl(firstImg.drive_file_id) + "?s=200"} alt={p.name} />
                              ) : (
                                <div className="chatbot-pcard-noimg">🛍️</div>
                              )}
                            </a>
                            <div className="chatbot-pcard-details">
                              <a
                                href={prodUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="chatbot-pname-link"
                                title="Abrir página do produto em nova aba"
                              >
                                <strong>{p.name} ↗</strong>
                              </a>
                              <span>{brl(p.price)}</span>
                              <button
                                type="button"
                                className="btn primary xs"
                                onClick={() => {
                                  cart.add(p);
                                  showToast(`🛍️ ${p.name} adicionado ao carrinho!`);
                                }}
                              >
                                + Adicionar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

          {/* Preview de imagem anexada */}
          {imageFile && (
            <div className="chatbot-image-preview">
              <img src={imageFile} alt="Preview" />
              <button
                type="button"
                className="chatbot-preview-remove"
                onClick={() => setImageFile(null)}
                aria-label="Remover imagem"
              >
                ✕
              </button>
            </div>
          )}

          {/* Barra de Entrada de Dados */}
          <div className="chatbot-input-bar">
            {/* Input escondido para foto */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />

            {/* Botão de Anexo de Foto */}
            <button
              type="button"
              className="chatbot-tool-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Enviar foto para pesquisar"
              aria-label="Enviar foto"
            >
              📷
            </button>

            {/* Botão de Áudio (Microfone com fala transcrita enviada direto para a IA corrigir e responder) */}
            <VoiceSearchButton
              className="chatbot-tool-btn chatbot-voice-btn"
              title="Falar por voz (envia para o atendente)"
              onTranscript={(text) => {
                setInput(text);
              }}
              onFinalTranscript={(finalText) => {
                setInput("");
                handleSend(finalText);
              }}
            />

            {/* Campo de Texto */}
            <input
              type="text"
              placeholder={imageFile ? "Diga algo sobre esta foto..." : "Digite ou fale sua dúvida..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />

            {/* Botão Enviar */}
            <button
              type="button"
              className="chatbot-send-btn"
              onClick={() => handleSend()}
              disabled={loading || (!input.trim() && !imageFile)}
              aria-label="Enviar mensagem"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
