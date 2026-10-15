# Expositor — catálogos online com fotos do Google Drive

Next.js 15 + Supabase (login e banco) + Google Drive (fotos) + Vercel. As fotos **não ficam no seu banco**: o app guarda só o ID do arquivo no Drive e entrega uma miniatura em cache.

## Configuração (uma vez)

1. **Supabase**: crie o projeto e rode `supabase/migrations/001_init.sql` no SQL Editor.
2. **Google Cloud**: crie um OAuth Client (Web). Ative a *Google Drive API*. Em *Authorized redirect URIs* coloque `https://iqwfhendcawwilbojqwz.supabase.co/auth/v1/callback`. Tela de consentimento: adicione o escopo `drive.readonly`.
3. **Supabase → Authentication → Providers → Google**: cole Client ID e Secret. Em *URL Configuration*, adicione `http://localhost:3000/**` e o domínio da Vercel em Redirect URLs.
4. Copie `.env.example` para `.env.local` e preencha.
5. `npm install && npm run dev`

## Deploy na Vercel
Importe a pasta, cadastre as 5 variáveis do `.env.example` e publique.

## Como funciona
- **Loja** (`/painel`): nome, endereço `/minha-loja`, tipo de produto, WhatsApp, formas de pagamento e entrega (apenas informativas — não há pagamento no app).
- **Importar** (`/painel/importar`): navegue pelo Drive, marque fotos e escolha *um produto por foto* (nome = nome do arquivo), *juntar em um produto* ou *adicionar a um existente*.
- **Produtos** (`/painel/produtos`): edite nome, preço (opcional), descrição, estoque (opcional — marque a caixa para controlar), visibilidade, fotos.
- **Catálogo público** (`/<slug>`): carrinho local e botão que abre `wa.me` com o pedido pronto.
- **Busca** (`/`): por nome da loja, tipo de produto, cidade ou nome de produto.

## Notas
- O refresh token do Google fica em `drive_tokens`, sem policy de RLS (só o service role acessa). Mantenha `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor.
- O estoque não baixa sozinho: o lojista ajusta ao confirmar o pedido (o pedido vai por WhatsApp, não passa pelo app).
- Enquanto o app Google estiver em modo "Teste", só usuários de teste conseguem entrar; para o público, publique o app (escopo `drive.readonly` exige verificação do Google).
