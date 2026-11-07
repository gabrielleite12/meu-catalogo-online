import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 45;

function normalizeText(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KNOWN_BRANDS = ["nike", "puma", "adidas", "lacoste", "vans", "olympikus", "mizuno", "converse", "asics", "fila", "gucci", "zara"];
const KNOWN_COLORS = [
  "amarelo", "amarela", "amarelos", "amarelas",
  "preto", "preta", "pretos", "pretas",
  "vermelho", "vermelha", "vermelhos", "vermelhas",
  "azul", "azuis",
  "branco", "branca", "brancos", "brancas",
  "verde", "verdes",
  "rosa", "cinza", "marrom", "bege", "laranja"
];

function scoreProductRelevance(product: any, queryNorm: string, queryWords: string[], queryBrand?: string, queryColor?: string): number {
  let score = 0;
  const pName = normalizeText(product.name);
  const pCat = normalizeText(product.category || "");
  const pSub = normalizeText(product.subcategory || "");
  const pTags = (product.tags || []).map((t: string) => normalizeText(t)).join(" ");
  const pVariants = (product.product_variants || []).map((v: any) => normalizeText(v.name)).join(" ");
  const fullP = `${pName} ${pCat} ${pSub} ${pTags} ${pVariants}`;

  // 1. Marca
  if (queryBrand) {
    if (fullP.includes(queryBrand)) {
      score += 120;
    } else {
      score -= 70; // Penaliza marcas concorrentes
    }
  }

  // 2. Cor
  if (queryColor) {
    // Normaliza amarelo/amarela
    const rootColor = queryColor.slice(0, 4);
    if (fullP.includes(rootColor)) {
      score += 60;
    }
  }

  // 3. Correspondência da frase
  if (queryNorm.length > 2 && fullP.includes(queryNorm)) {
    score += 90;
  }

  // 4. Termos individuais
  for (const word of queryWords) {
    if (word.length < 2) continue;
    if (pName.includes(word)) score += 30;
    if (pSub.includes(word)) score += 25;
    if (pVariants.includes(word)) score += 20;
    if (pTags.includes(word)) score += 15;
    if (pCat.includes(word)) score += 10;
  }

  return score;
}

export async function POST(req: NextRequest) {
  try {
    const { message, image, slug, history = [] } = await req.json();

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Chave NVIDIA_API_KEY não configurada no servidor." }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const queryNorm = normalizeText(message || "");
    const queryWords = queryNorm.split(" ").filter((w) => w.length > 1);

    // Detecta intenção de Marca e Cor na mensagem do cliente
    const detectedBrand = KNOWN_BRANDS.find((b) => queryNorm.includes(b));
    const detectedColor = KNOWN_COLORS.find((c) => queryNorm.includes(c));

    let systemPrompt = "";
    let contextProducts: any[] = [];
    let topMatchedProducts: any[] = [];
    let sameBrandAlternatives: any[] = [];

    if (slug) {
      // 1. MODO LOJA ESPECÍFICA (RAG + Consultor Inteligente)
      const { data: store } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();

      if (!store) {
        return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
      }

      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, category, subcategory, tags, description, product_images(drive_file_id, position), product_variants(id, name, stock)")
        .eq("store_id", store.id)
        .eq("active", true)
        .order("position")
        .limit(100);

      contextProducts = products ?? [];

      // RAG Retrieval & Relevance Scoring
      const scored = contextProducts.map((p) => ({
        product: p,
        score: scoreProductRelevance(p, queryNorm, queryWords, detectedBrand, detectedColor),
      }));

      scored.sort((a, b) => b.score - a.score);
      topMatchedProducts = scored.filter((s) => s.score > 0).map((s) => s.product);

      // Agrupa alternativas inteligentes da MESMA MARCA se uma marca foi pedida
      if (detectedBrand) {
        sameBrandAlternatives = contextProducts.filter((p) => {
          const pFull = normalizeText(`${p.name} ${p.subcategory || ""} ${(p.tags || []).join(" ")}`);
          return pFull.includes(detectedBrand) && !topMatchedProducts.slice(0, 1).some((top) => top.id === p.id);
        });
      }

      const formatProdLine = (p: any) => {
        const variants = (p.product_variants ?? []).map((v: any) => `${v.name} (estoque: ${v.stock ?? "disponível"})`).join(", ");
        const priceStr = p.price ? `R$ ${Number(p.price).toFixed(2).replace(".", ",")}` : "Sob consulta";
        return `- ID: "${p.id}" | Nome: "${p.name}" | Preço: ${priceStr} | Categoria: ${p.category || "Geral"}${p.subcategory ? ` | Subcategoria: ${p.subcategory}` : ""}${variants ? ` | Variações/Tamanhos: [${variants}]` : ""}`;
      };

      let ragSection = "";
      if (topMatchedProducts.length > 0) {
        ragSection += `\n[PRODUTO PRINCIPAL CORRESPONDENTE À CONSULTA]:\n${topMatchedProducts.slice(0, 2).map(formatProdLine).join("\n")}\n`;
      }
      if (sameBrandAlternatives.length > 0) {
        ragSection += `\n[OUTROS MODELOS OU CORES DA MESMA MARCA DISPONÍVEIS NA LOJA]:\n${sameBrandAlternatives.slice(0, 4).map(formatProdLine).join("\n")}\n`;
      }

      const allSection = contextProducts.map(formatProdLine).join("\n");

      systemPrompt = `Você é o vendedor e consultor de moda virtual exclusivo (versão BETA) da loja "${store.name}".
Informações da Loja:
- Nome: ${store.name}
- Cidade: ${store.city || "Brasil"}
- WhatsApp: ${store.whatsapp || "Disponível na página"}
- Pagamento: ${(store.payment_methods || []).join(", ") || "Pix e Cartão"}
- Entrega: ${(store.delivery_methods || []).join(", ") || "Envio / Retirada"}
${ragSection}
Catálogo Completo da Loja:
${allSection || "(Nenhum produto cadastrado no momento)"}

DIRETRIZES DE UM VENDEDOR EXPERT E INTELIGENTE:
1. ATENDIMENTO CONSULTIVO E SUGESTÕES INTELIGENTES:
   - Se o cliente perguntar por uma marca ou modelo (ex: "Tem Puma amarelo?", "Tem Nike?"):
     a) Responda sobre o modelo exato que ele pediu, confirmando preço e características.
     b) SEJA PROATIVO E INDIQUE OUTRAS OPÇÕES DA MESMA MARCA: cite que também temos outros modelos ou cores daquela mesma marca (ex: "Temos o Puma Amarelo e também temos outros modelos da Puma como X e Y!").
     c) Se o cliente pediu uma cor ou tamanho específico e aquele tamanho/cor não estiver disponível, avise com simpatia quais cores ou tamanhos AINDA TEMOS em estoque daquele modelo!
2. ADIÇÃO DIRETA AO CARRINHO:
   - Se o cliente pedir para adicionar ao carrinho ("adiciona no carrinho", "coloca 1 do Puma", "quero o Nike TN"):
     Gere no final da resposta a tag com o ID EXATO do produto solicitado:
     <!--ACTION:{"type":"add_to_cart","productId":"<ID_DO_PRODUTO_PEDIDO>","productName":"<NOME>","qty":1}-->
     O produto exato será adicionado ao carrinho na hora!
3. CARDS DE PRODUTOS RECOMENDADOS:
   - Sempre que você citar ou recomendar produtos para o cliente ver no chat, adicione no final:
     <!--ACTION:{"type":"suggest_products","productIds":["<ID_1>","<ID_2>"]}-->
     O chat exibirá mini-cards com fotos reais e links para a aba do produto.
4. NUNCA invente marcas ou produtos que não estejam no catálogo acima.
5. Fale em Português do Brasil com entusiasmo, educação e clareza.`;
    } else {
      // 2. MODO GLOBAL (Aprile - Vitrine Zap)
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, slug, category, city, description")
        .eq("published", true)
        .limit(40);

      const storesList = (stores ?? []).map((s) => `- Loja: "${s.name}" (link: /${s.slug}) | Categoria: ${s.category || "Variados"} | Cidade: ${s.city || "Brasil"}`).join("\n");

      systemPrompt = `Seu nome é Aprile. Você é a consultora e assistente de busca oficial do Vitrine Zap (versão BETA).
Lojas Ativas na Plataforma:
${storesList || "(Nenhuma loja pública no momento)"}

DIRETRIZES:
1. Apresente-se como Aprile sempre que oportuno.
2. Seja proativa: se a pessoa procura um produto, indique lojas que vendem aquela categoria ou na cidade da pessoa.
3. Se a pessoa falar nomes com variações fonéticas (ex: "tenis naique", "puma", "aiddas"), entenda a intenção e recomende as lojas que possuem esses itens.
4. Forneça links no formato [Nome da Loja](/${"{slug}"}).`;
    }

    const nvidiaMessages: any[] = [{ role: "system", content: systemPrompt }];

    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
    for (const h of recentHistory) {
      if (h.role && h.content) {
        nvidiaMessages.push({ role: h.role, content: h.content });
      }
    }

    if (image && typeof image === "string" && image.startsWith("data:image/")) {
      nvidiaMessages.push({
        role: "user",
        content: [
          { type: "text", text: message || "O que você vê nesta foto? Temos algo parecido na loja?" },
          { type: "image_url", image_url: { url: image } }
        ]
      });
    } else {
      nvidiaMessages.push({
        role: "user",
        content: message || "Olá! Quais produtos você tem na loja?"
      });
    }

    const nvidiaRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-90b-vision-instruct",
        messages: nvidiaMessages,
        max_tokens: 380,
        temperature: 0.25
      })
    });

    if (!nvidiaRes.ok) {
      const errText = await nvidiaRes.text();
      console.error("NVIDIA API error:", nvidiaRes.status, errText);
      return NextResponse.json({ error: "Erro ao consultar IA da NVIDIA", details: errText }, { status: 502 });
    }

    const nvidiaData = await nvidiaRes.json();
    const rawReply = nvidiaData?.choices?.[0]?.message?.content || "Desculpe, não consegui processar a resposta no momento.";

    let action: any = null;
    let cleanReply = rawReply;

    const actionMatch = rawReply.match(/<!--ACTION:\s*(\{.*?\})\s*-->/s);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
        cleanReply = rawReply.replace(/<!--ACTION:\s*\{.*?\}\s*-->/gs, "").trim();
      } catch (e) {
        console.warn("Failed to parse action json:", e);
      }
    }

    // Validação de segurança RAG para carrinho
    if (action?.type === "add_to_cart" && topMatchedProducts.length > 0) {
      const currentSelected = contextProducts.find((p) => p.id === action.productId);
      const topMatch = topMatchedProducts[0];
      
      if (topMatch && (!currentSelected || (detectedBrand && !normalizeText(currentSelected.name).includes(detectedBrand)))) {
        action.productId = topMatch.id;
        action.productName = topMatch.name;
      }
    }

    // Constrói lista rica de produtos para o chat com imagem e link
    let matchedProducts: any[] = [];
    if (action?.type === "suggest_products" && Array.isArray(action.productIds)) {
      matchedProducts = contextProducts.filter((p) => action.productIds.includes(p.id));
    } else if (action?.type === "add_to_cart" && action.productId) {
      const prod = contextProducts.find((p) => p.id === action.productId);
      if (prod) {
        matchedProducts = [prod];
        // Adiciona até 2 alternativas da mesma marca para o cliente comparar
        if (sameBrandAlternatives.length > 0) {
          matchedProducts.push(...sameBrandAlternatives.slice(0, 2));
        }
      }
    } else if (topMatchedProducts.length > 0) {
      matchedProducts = [
        ...topMatchedProducts.slice(0, 2),
        ...sameBrandAlternatives.slice(0, 2),
      ].slice(0, 3);
    }

    return NextResponse.json({
      reply: cleanReply,
      action,
      products: matchedProducts,
      ragUsed: true
    });
  } catch (error: any) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: error?.message || "Erro interno do servidor" }, { status: 500 });
  }
}
