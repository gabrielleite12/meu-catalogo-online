// Sugestões de categoria e tipo/modelo para agilizar o cadastro. O lojista pode digitar qualquer outro valor.
export const CATEGORY_PRESETS: Record<string, string[]> = {
  "Calçados": ["Tênis", "Sandália", "Chinelo", "Bota", "Sapato social", "Sapatilha", "Sapatênis"],
  "Roupas": ["Camiseta", "Camisa", "Blusa", "Calça", "Short", "Bermuda", "Vestido", "Saia", "Jaqueta", "Moletom"],
  "Acessórios": ["Boné", "Cinto", "Óculos", "Relógio", "Colar", "Brinco", "Pulseira"],
  "Bolsas": ["Bolsa", "Mochila", "Carteira", "Necessaire"],
  "Moda íntima": ["Cueca", "Calcinha", "Sutiã", "Meia", "Pijama"],
  "Infantil": ["Roupa infantil", "Calçado infantil", "Brinquedo"],
  "Beleza": ["Perfume", "Maquiagem", "Cabelo", "Pele", "Unhas"],
  "Eletrônicos": ["Celular", "Fone", "Carregador", "Caixa de som", "Capa"],
  "Casa": ["Decoração", "Cozinha", "Cama e banho", "Organização"],
  "Alimentos": ["Doces", "Salgados", "Bebidas", "Bolos"],
};
export const PRESET_CATEGORIES = Object.keys(CATEGORY_PRESETS);

/** Tipos sugeridos para uma categoria (ignora maiúsculas e acentos). */
export function typesFor(category: string | null | undefined): string[] {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const k = PRESET_CATEGORIES.find((c) => n(c) === n(category ?? ""));
  return k ? CATEGORY_PRESETS[k] : [];
}
