"use client";
import { useState } from "react";
import VoiceSearchButton from "@/components/VoiceSearchButton";

export default function HomeSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);

  return (
    <form className="search home-search-form" action="/">
      <div className="home-search-input-wrap">
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque por loja, tipo de produto ou cidade…"
          autoFocus={!!initialQuery}
        />
        <VoiceSearchButton
          className="home-voice-btn"
          onTranscript={(text) => {
            setQ(text);
            // Redireciona ou submete automaticamente com o termo falado
            const form = document.querySelector(".home-search-form") as HTMLFormElement;
            if (form) {
              const input = form.querySelector('input[name="q"]') as HTMLInputElement;
              if (input) input.value = text;
              form.submit();
            }
          }}
        />
      </div>
      <button className="btn primary" type="submit">Buscar</button>
    </form>
  );
}
