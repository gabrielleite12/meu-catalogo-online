# Expositor — catálogos online com fotos do Google Drive

Next.js 15 + Supabase (login e banco) + Google Drive (fotos) + Vercel. As fotos **não ficam no seu banco**: o app guarda só o ID do arquivo no Drive e entrega uma miniatura em cache.

## Configuração (uma vez)

1. **Supabase**: crie o projeto e rode **todos** os arquivos de `supabase/migrations/` em ordem (001 a 012) no SQL Editor. Ao atualizar o app, rode as migrações novas **antes** de publicar o código.
2. **Google Cloud**: crie um OAuth Client (Web). Ative a *Google Drive API*. Em *Authorized redirect URIs* coloque `https://iqwfhendcawwilbojqwz.supabase.co/auth/v1/callback`. Tela de consentimento: adicione o escopo `drive.readonly`.
3. **Supabase → Authentication → Providers → Google**: cole Client ID e Secret. Em *URL Configuration*, adicione `http://localhost:3000/**` e o domínio da Vercel em Redirect URLs.
4. Copie `.env.example` para `.env.local` e preencha.
5. `npm install && npm run dev`
6. **App instalável e avisos (opcional):** o site já é um PWA (manifest, ícones e service worker). Para os avisos push, gere as chaves com `npx web-push generate-vapid-keys` e preencha `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (local e na Vercel). Sem elas o app funciona normalmente, só não envia avisos. No iPhone, os avisos só funcionam depois de *Compartilhar → Adicionar à Tela de Início*.

## Deploy na Vercel
Importe a pasta, cadastre as 5 variáveis do `.env.example` e publique.

## Como funciona
- **Loja** (`/painel`): nome, endereço `/minha-loja`, tipo de produto, WhatsApp, formas de pagamento e entrega (apenas informativas — não há pagamento no app).
- **Importar** (`/painel/importar`): navegue pelo Drive, marque fotos e escolha *um produto por foto* (nome = nome do arquivo), *juntar em um produto* ou *adicionar a um existente*.
- **Produtos** (`/painel/produtos`): edite nome, preço (opcional), descrição, estoque (opcional — marque a caixa para controlar), visibilidade, fotos.
- **Categorias** (`/painel/<loja>/categorias`): cada produto tem categoria, tipo/modelo e etiquetas; renomeie/junte tudo de uma vez. Viram filtros na vitrine.
- **Fretes** (`/painel/<loja>/fretes`): regras por cidade, estado ou demais locais (valor, grátis, a combinar, não entrega, grátis acima de R$ X), soma ao total ou só informa, retirada na loja. Calculado no banco ao pedir (`shipping_quote`).
- **Catálogo público** (`/<slug>`): carrinho local e botão que abre `wa.me` com o pedido pronto.
- **Busca** (`/`): por nome da loja, tipo de produto, cidade ou nome de produto.

## Notas
- O refresh token do Google fica em `drive_tokens`, sem policy de RLS (só o service role acessa). Mantenha `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor.
- Pedidos: o estoque é reservado ao pedir. Fluxo: novo → enviado (em trânsito) → entregue (o cliente confirma em *Minha conta*, ou vira entregue sozinho em 7 dias). O dono pode combinar o **dia da entrega** (e a janela, ex.: "entre 14h e 18h"); o cliente é avisado por push e vê a data em *Minha conta*. O dono pode **aprovar** o pedido (novo → aprovado). Cancelar guarda quem cancelou, quando e o motivo, devolve o estoque e avisa a outra parte (o cliente cancela só pedido novo; a loja cancela novo, aprovado ou em trânsito). Devolver itens (aba Pedidos → *Devolução rápida*) devolve o estoque; itens com defeito podem ser descartados sem repor.
- Enquanto o app Google estiver em modo "Teste", só usuários de teste conseguem entrar; para o público, publique o app (escopo `drive.readonly` exige verificação do Google).
