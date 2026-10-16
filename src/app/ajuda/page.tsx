import Link from "next/link";

export const metadata = { title: "Como usar — Expositor" };

export default function Ajuda() {
  return (
    <>
      <header className="top"><Link href="/" className="logo">Expositor</Link><nav /><Link className="btn" href="/login?next=/painel">Entrar</Link></header>
      <main className="wrap prose">
        <h1>Como usar o Expositor</h1>
        <p className="muted">Guia rápido para quem vai vender e para quem vai comprar.</p>

        <h2>Para lojistas — criar seu catálogo</h2>
        <ol>
          <li><b>Entre com o Google.</b> Clique em <Link href="/login?next=/painel">Criar meu catálogo</Link> e escolha sua conta. Pedimos apenas nome, e-mail e foto de perfil.</li>
          <li><b>Crie o catálogo.</b> Em <i>Meus catálogos → Novo catálogo</i>, informe nome, endereço (ex.: <code>/minha-loja</code>), tipo de produto, cidade, seu WhatsApp e as formas de pagamento e entrega que você aceita. Envie a logo (PNG, JPG ou WEBP, até 1 MB). Você pode ter vários catálogos na mesma conta.</li>
          <li><b>Conecte o Google Drive.</b> Na aba <i>Importar do Drive</i>, clique em <i>Conectar Google Drive</i> e aceite a permissão. O app só acessa as fotos que <u>você escolher</u>, nunca o resto do seu Drive, e não altera nada.</li>
          <li><b>Escolha as fotos.</b> Clique em <i>Escolher fotos no Google Drive</i>, abra suas pastas na janela do Google e marque quantas fotos quiser. Depois escolha:
            <ul>
              <li><b>Um produto por foto</b> — cada foto vira um produto (o nome inicial é o nome do arquivo);</li>
              <li><b>Juntar em um produto</b> — várias fotos viram um único produto;</li>
              <li><b>Adicionar a…</b> — acrescenta fotos a um produto que já existe.</li>
            </ul>
          </li>
          <li><b>Ajuste os produtos.</b> Na aba <i>Produtos</i> mude nome, descrição e preço (opcional). Se quiser, marque <i>Controlar estoque</i> e informe a quantidade. Você também pode ocultar ou excluir produtos.</li>
          <li><b>Divulgue.</b> Envie o link <code>…/seu-endereço</code> aos clientes. Seu catálogo também aparece na busca da página inicial.</li>
          <li><b>Atenda os pedidos.</b> O cliente envia o pedido pelo WhatsApp e ele fica registrado em <i>Pedidos</i>. Combine pagamento e entrega com ele e, quando concluir, clique em <i>Marcar como finalizado</i>. O estoque é baixado e o cliente passa a poder avaliar sua loja e os produtos.</li>
        </ol>

        <h2>Para clientes — fazer um pedido</h2>
        <ol>
          <li>Abra o catálogo da loja, toque em <i>Adicionar</i> nos produtos e depois em <i>Ver pedido</i>.</li>
          <li>Entre com o Google e complete o cadastro em <Link href="/conta">Minha conta</Link> (nome, WhatsApp e endereço) — só na primeira vez.</li>
          <li>Toque em <i>Enviar pedido pelo WhatsApp</i>. A mensagem já vai pronta para a loja. O pagamento é combinado direto com ela.</li>
          <li>Quando a loja finalizar o pedido, ele aparece em <i>Minha conta</i> com a opção de <b>avaliar a loja e cada produto</b> com estrelas e comentário.</li>
        </ol>

        <h2>Problemas comuns</h2>
        <div className="card note">
          <h3>“Erro 403: access_denied” ou “não concluiu o processo de verificação do Google”</h3>
          <p>O app do Google ainda está em <b>modo de teste</b>, e só contas aprovadas pelo desenvolvedor conseguem entrar.</p>
          <p><b>Se você é o dono do sistema:</b> abra o <a href="https://console.cloud.google.com/auth/audience" target="_blank" rel="noopener">Google Auth Platform → Público</a> e clique em <i>Publicar app</i> (status “Em produção”). Para liberar só algumas pessoas por enquanto, adicione os e-mails em <i>Usuários de teste</i>.</p>
          <p><b>Se você é cliente ou lojista:</b> peça ao administrador da plataforma para liberar sua conta ou publicar o app.</p>
        </div>
        <div className="card note">
          <h3>Aviso “O Google não verificou este app”</h3>
          <p>Em modo de teste isso é normal: clique em <i>Avançado → Acessar Expositor (não seguro)</i> e continue. Depois de publicado, o aviso não aparece.</p>
        </div>
        <div className="card note">
          <h3>As fotos não aparecem depois de reconectar o Drive</h3>
          <p>O app só enxerga as fotos que você escolheu pelo Google. Se um produto ficou sem imagem, abra <i>Importar do Drive</i> e escolha a foto de novo.</p>
        </div>
        <div className="card note">
          <h3>Não consigo avaliar uma loja</h3>
          <p>A avaliação só é liberada depois que a loja marca seu pedido como <b>finalizado</b>.</p>
        </div>
      </main>
    </>
  );
}
