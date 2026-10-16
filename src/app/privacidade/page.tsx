import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";

export const metadata = { title: "Política de Privacidade — Expositor" };

export default function Privacidade() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <h1>Política de Privacidade</h1>
        <p className="muted">Última atualização: 16 de outubro de 2026</p>
        <p>O Expositor é uma plataforma gratuita para criar catálogos online e receber pedidos pelo WhatsApp. Esta política explica quais dados usamos e por quê.</p>

        <h2>Dados que coletamos</h2>
        <ul>
          <li><b>Conta Google:</b> nome, e-mail e foto de perfil, apenas para identificar você no login.</li>
          <li><b>Cadastro de cliente:</b> nome, telefone e endereço que você informa para fazer pedidos.</li>
          <li><b>Pedidos e avaliações:</b> itens pedidos, valores, status e as avaliações (estrelas e comentários) que você publica.</li>
          <li><b>Dados do catálogo (lojistas):</b> nome da loja, logo, descrição, WhatsApp, formas de pagamento e entrega e produtos.</li>
        </ul>

        <h2>Acesso ao Google Drive</h2>
        <p>Ao conectar o Drive, solicitamos apenas o escopo <code>drive.file</code>: o app acessa <b>somente as fotos que você escolher</b> na janela do Google Picker. Não vemos, listamos nem alteramos o restante do seu Drive.</p>
        <ul>
          <li>Guardamos o <b>identificador</b> das fotos escolhidas, não uma cópia dos arquivos.</li>
          <li>Exibimos miniaturas dessas fotos no catálogo, buscando-as no Drive em seu nome.</li>
          <li>Guardamos um token de acesso do Google, de forma restrita no servidor, para poder exibir as fotos. Ele nunca é mostrado a outras pessoas.</li>
          <li>O uso dos dados recebidos do Google segue a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Política de Dados de Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado. Os dados do Drive são usados apenas para exibir seu catálogo e não são vendidos, usados para publicidade nem usados para treinar modelos de IA.</li>
        </ul>

        <h2>Com quem compartilhamos</h2>
        <ul>
          <li><b>Lojas:</b> ao enviar um pedido, seu nome, telefone e endereço ficam visíveis para a loja escolhida, para que ela possa atendê-lo.</li>
          <li><b>Público:</b> seu primeiro nome e o texto das avaliações aparecem nas páginas da loja e dos produtos.</li>
          <li><b>Provedores de infraestrutura:</b> Supabase (banco de dados e autenticação), Vercel (hospedagem) e Google (login e Drive).</li>
        </ul>
        <p>Não vendemos seus dados.</p>

        <h2>Seus direitos</h2>
        <p>Você pode corrigir seus dados em <Link href="/conta">Minha conta</Link>. Para excluir sua conta e seus dados, ou revogar o acesso ao Drive, escreva para <a href="mailto:bielleite59@gmail.com">bielleite59@gmail.com</a>. O acesso ao Drive também pode ser removido a qualquer momento em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>.</p>

        <h2>Segurança e retenção</h2>
        <p>Usamos conexão criptografada e regras de acesso por usuário no banco de dados. Mantemos os dados enquanto sua conta existir ou até você pedir a exclusão.</p>

        <h2>Contato</h2>
        <p><a href="mailto:bielleite59@gmail.com">bielleite59@gmail.com</a></p>
      </main>
    </>
  );
}
