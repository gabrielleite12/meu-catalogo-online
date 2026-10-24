import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Como usar — Expositor",
  description: "Passo a passo com telas: criar o catálogo, cadastrar produtos e estoque, atender pedidos, agendar entregas, devoluções e como comprar.",
};

type Step = { id: string; title: string; img?: string; alt?: string; cap?: string; body: ReactNode };

const Phone = ({ img, alt, cap }: { img: string; alt: string; cap?: string }) => (
  <figure className="phone">
    <div className="frame"><img src={`/ajuda/${img}.jpg`} alt={alt} width={600} height={1299} loading="lazy" decoding="async" /></div>
    {cap && <figcaption>{cap}</figcaption>}
  </figure>
);

const Steps = ({ items, offset = 0 }: { items: Step[]; offset?: number }) => (
  <ol className="hsteps">
    {items.map((s, i) => (
      <li className="step" id={s.id} key={s.id}>
        <div className="stext">
          <span className="snum">{offset + i + 1}</span>
          <h3>{s.title}</h3>
          {s.body}
        </div>
        {s.img && <Phone img={s.img} alt={s.alt ?? s.title} cap={s.cap} />}
      </li>
    ))}
  </ol>
);

const Tip = ({ children, kind = "tip" }: { children: ReactNode; kind?: "tip" | "warn" }) => (
  <p className={"htip " + kind}><span aria-hidden>{kind === "tip" ? "💡" : "⚠️"}</span><span>{children}</span></p>
);

const owner: Step[] = [
  {
    id: "entrar", title: "Entre com o Google", img: "entrar", alt: "Tela de entrada com o botão Continuar com Google",
    cap: "Tela de entrada",
    body: (<>
      <p>Toque em <Link href="/login?next=/painel">Criar meu catálogo</Link> e escolha sua conta Google. Pedimos só nome, e-mail e foto de perfil.</p>
      <p>Na primeira vez, o Google pode avisar que o app não foi verificado — veja em <a href="#problemas">Problemas comuns</a>.</p>
    </>),
  },
  {
    id: "painel", title: "Seu painel: um lugar para tudo", img: "painel", alt: "Painel com a contagem de catálogos, produtos e pedidos novos",
    cap: "Painel com seus catálogos",
    body: (<>
      <p>Em <b>Meus catálogos</b> você vê quantos produtos e <b>pedidos novos</b> cada catálogo tem. Cada cartão tem atalhos: <i>Produtos</i>, <i>Importar</i>, <i>Pedidos</i>, <i>Configurar</i> e <i>Ver</i> (a página pública).</p>
      <p>Toque em <b>+ Novo catálogo</b> para criar outro — você pode ter vários na mesma conta.</p>
    </>),
  },
  {
    id: "configurar", title: "Configure a loja", img: "loja", alt: "Formulário de configuração com nome, endereço, tipo de produto e cidade",
    cap: "Aba Configurações",
    body: (<>
      <ul>
        <li><b>Nome e endereço:</b> o endereço vira o link público (ex.: <code>/minha-loja</code>) e dá para copiar na hora.</li>
        <li><b>Logo:</b> PNG, JPG ou WEBP de até 1 MB.</li>
        <li><b>WhatsApp com DDD:</b> é para onde os pedidos chegam. Sem ele, o cliente não consegue pedir.</li>
        <li><b>Pagamento e entrega:</b> informe o que você aceita (Pix, cartão, entrega, retirada…). Aparece na página do produto.</li>
        <li><b>Visível na busca e por link:</b> desmarque para deixar o catálogo fora do ar enquanto monta tudo.</li>
      </ul>
    </>),
  },
  {
    id: "importar", title: "Traga as fotos do Google Drive", img: "importar", alt: "Tela Importar do Google Drive com os botões Escolher fotos e as opções de criar produtos",
    cap: "Aba Importar do Drive",
    body: (<>
      <p>Na aba <b>Importar do Drive</b>, conecte o Google Drive (uma vez) e toque em <b>Escolher fotos</b>. Abra suas pastas na janela do Google e marque quantas quiser. O app só enxerga o que <u>você escolher</u> e nunca altera seus arquivos.</p>
      <p>Depois, na barra de baixo, escolha como criar:</p>
      <ul>
        <li><b>Criar produto(s), um por foto:</b> cada foto vira um produto (o nome vem do arquivo).</li>
        <li><b>Juntar em um produto:</b> várias fotos num só (ex.: o mesmo tênis em 3 cores).</li>
        <li><b>Adicionar a…:</b> acrescenta fotos a um produto que já existe.</li>
      </ul>
      <Tip>Dá para definir categoria e etiquetas já na importação. O nome do arquivo costuma ficar feio (“IMG 2031”) — ajuste na próxima etapa.</Tip>
    </>),
  },
  {
    id: "produtos", title: "Revise a lista de produtos", img: "produtos", alt: "Lista de produtos com filtros Todos, Visíveis, Ocultos, Sem estoque e Estoque baixo",
    cap: "Aba Produtos",
    body: (<>
      <p>Aqui você enxerga tudo de uma vez: preço, quantidade de variações, unidades em estoque e etiquetas.</p>
      <ul>
        <li><b>Filtros:</b> <i>Visíveis</i>, <i>Ocultos</i>, <i>Sem estoque</i> e <i>Estoque baixo</i> mostram o que precisa de atenção.</li>
        <li><b>Busca</b> por nome, SKU, código de barras ou categoria.</li>
        <li><b>Ocultar / Mostrar</b> tira o produto da vitrine sem apagar.</li>
        <li><b>Seleção em lote:</b> marque vários para ocultar, mudar categoria, adicionar etiquetas, excluir ou <b>juntar em um produto</b>.</li>
      </ul>
      <p>Toque no produto para abrir o editor.</p>
    </>),
  },
  {
    id: "editar", title: "Cadastre o produto: nome, preço e estoque", img: "editor", alt: "Editor de produto com fotos, nome, SKU e a escolha entre Produto simples e Com variações",
    cap: "Editor de produto",
    body: (<>
      <p>Troque o nome, escreva a descrição, defina a <b>categoria</b> (ex.: Calçados), o <b>tipo/modelo</b> (ex.: Tênis) e as etiquetas, e reordene ou remova fotos. Depois escolha o <b>tipo de produto</b>:</p>
      <ul>
        <li><b>Produto simples:</b> um só estoque. Marque <i>Controlar estoque</i> e informe a quantidade (ou deixe sem controle e ele fica sempre disponível).</li>
        <li><b>Com variações:</b> tamanho, cor, número… cada combinação com o seu próprio estoque.</li>
      </ul>
      <Tip><b>Preço 0 ou vazio</b> mostra “Sob consulta” na vitrine. Com <i>Ocultar sozinho quando o estoque acabar</i> ligado, o produto sai da vitrine quando o estoque chega a 0 e volta sozinho quando você repõe. Em <i>Avisar quando restar até</i> você define o nível de “estoque baixo”.</Tip>
    </>),
  },
  {
    id: "variacoes", title: "Tamanhos e cores com estoque por combinação", img: "variacoes", alt: "Grade de variações onde cada combinação tem Estoque, Preço, SKU, código de barras e foto",
    cap: "Grade de variações (no celular, um cartão por combinação)",
    body: (<>
      <ol className="mini">
        <li>Use um <b>atalho</b> (Calçados, Roupas, Só cor) ou escolha um <i>modelo</i> e digite as opções: <code>Número: 36, 37, 38</code> e <code>Cor: Preto, Branco</code>.</li>
        <li>Toque em <b>Criar todas as combinações</b>.</li>
        <li>Preencha o <b>Estoque</b> de cada uma. Cada variação pode ter <b>preço próprio</b>, SKU, código de barras e a <b>foto da sua cor</b> — a foto troca na página do produto quando o cliente escolhe a cor.</li>
        <li>Toque em <b>Salvar</b>.</li>
      </ol>
      <Tip><b>Estoque vazio</b> = sem controle (sempre disponível). <b>Estoque 0</b> = esgotado: a combinação aparece riscada para o cliente. Apague a linha de combinações que não existem.</Tip>
      <Tip kind="warn">Criou um produto por foto sem querer? Marque-os na lista e use <i>Juntar em um produto</i>; depois use <i>Copiar variações do 1º</i> para reaproveitar a grade.</Tip>
    </>),
  },
  {
    id: "categorias", title: "Organize por categoria e tipo", img: "categorias", alt: "Aba Categorias com a lista de categorias e tipos, cada um com campo para renomear",
    cap: "Aba Categorias",
    body: (<>
      <p>Cada produto tem uma <b>categoria</b> (Calçados, Roupas…), um <b>tipo/modelo</b> (Tênis, Camiseta…) e <b>etiquetas</b> livres (Masculino, Nike…). Ao digitar, aparecem sugestões. Você também pode definir tudo de uma vez: marque vários produtos na lista e use <i>Definir categoria</i> ou <i>Definir tipo</i>, ou preencha ao <i>importar</i> as fotos.</p>
      <p>É isso que vira filtro na vitrine: o cliente toca na categoria, depois no tipo e nas etiquetas, e pode ordenar por preço ou ver só o que está disponível.</p>
      <p>Na aba <b>Categorias</b> você vê quantos produtos tem em cada nome e pode <b>renomear ou juntar</b> (ex.: “Calçado” e “Calçados”) de uma só vez. Na lista de produtos, o filtro <i>Sem categoria</i> mostra o que ainda falta organizar.</p>
    </>),
  },
  {
    id: "fretes", title: "Configure os fretes por região", img: "fretes", alt: "Aba Fretes com a escolha de somar ou só informar, atalhos e a lista de regras por cidade e estado",
    cap: "Aba Fretes",
    body: (<>
      <p>Na aba <b>Fretes</b> você diz quanto cobra em cada lugar. O cliente vê o frete no carrinho conforme a <b>cidade e o estado do cadastro dele</b>.</p>
      <ul>
        <li><b>Regras:</b> por <i>cidade</i>, por <i>estado inteiro</i> ou <i>todos os outros lugares</i>. Vale a mais específica. Em cada uma: cobrar um valor, frete grátis, a combinar ou não entrego. Dá para ter <i>grátis a partir de R$ X</i> e uma observação (“entrega em 2 dias”).</li>
        <li><b>Atalhos:</b> “Frete grátis na minha cidade”, “Outros lugares: a combinar”, “Não entregar em outros lugares”.</li>
        <li><b>Somar ao total ou só informar:</b> escolha se o frete entra no valor final do pedido ou se aparece só como informação (cobrado à parte).</li>
        <li><b>Retirada na loja:</b> se ligar, o cliente pode escolher retirar, sem frete.</li>
      </ul>
      <Tip>Sem nenhuma regra, o frete aparece como “a combinar com a loja”. Se você marcar “não entrego” para um lugar, o cliente de lá não consegue enviar o pedido (a menos que você aceite retirada).</Tip>
    </>),
  },
  {
    id: "pedidos", title: "Receba e acompanhe os pedidos", img: "aprovar-cancelar", alt: "Pedido aprovado com histórico, frete, botões de enviar e a caixa Cancelar este pedido com motivo",
    cap: "Pedido aprovado, com a opção de cancelar",
    body: (<>
      <p>Quando o cliente envia, o pedido aparece aqui (e você recebe um aviso no celular, se ativou). <b>O estoque é reservado na hora</b>, então ninguém compra a mesma unidade duas vezes.</p>
      <div className="flow" aria-label="Caminho do pedido">
        <span className="status novo">Novo</span><i>→</i><span className="status aprovado">Aprovado</span><i>→</i><span className="status enviado">Em trânsito</span><i>→</i><span className="status finalizado">Entregue</span>
      </div>
      <ul>
        <li><b>Aprovar pedido:</b> confirma que você vai atender; o cliente é avisado.</li>
        <li><b>Falar com o cliente:</b> abre o WhatsApp com uma mensagem pronta para a situação do pedido.</li>
        <li><b>Marcar como enviado:</b> o pedido fica <i>em trânsito</i> e o cliente é avisado.</li>
        <li><b>Retirado/entregue:</b> para quem busca na loja ou você entrega na hora.</li>
        <li><b>Cancelar este pedido…:</b> escolha o motivo e confirme. O estoque volta, o cliente é avisado e o pedido fica em <i>Cancelados</i> com <b>quem cancelou</b>, <b>quando</b> e <b>por quê</b>. Você pode cancelar pedido novo, aprovado ou em trânsito.</li>
        <li><b>Histórico:</b> cada pedido mostra a linha do tempo (pedido, aprovado, enviado, entregue/cancelado) e o frete cobrado. Use os filtros <i>Aprovados</i>, <i>Entregues</i>, <i>Cancelados</i> e <i>Devolvidos</i> para rever tudo depois.</li>
        <li>Quando o <b>cliente confirma</b> o recebimento, vira <i>Entregue</i>. Se ele esquecer, vira sozinho depois de <b>7 dias</b>.</li>
      </ul>
      <p>Os cartões do topo mostram quantos pedidos aguardam você, quantos estão a caminho e o valor já entregue. Use os filtros e a busca (nº, nome ou telefone).</p>
    </>),
  },
  {
    id: "cancelados", title: "Pedidos cancelados ficam no histórico", img: "cancelados", alt: "Filtro Cancelados mostrando quem cancelou, quando, o motivo e o aviso de que os itens voltaram ao estoque",
    cap: "Filtro Cancelados",
    body: (<>
      <p>Nada some: pedidos cancelados, aprovados, entregues e devolvidos ficam nos filtros da aba <b>Pedidos</b>. Em cada cancelado você vê <b>quem cancelou</b> (loja ou cliente), <b>quando</b>, o <b>motivo</b> e se os itens <b>voltaram ao estoque</b> — eles sempre voltam.</p>
      <p>O cliente também vê o pedido cancelado em <i>Minha conta</i>, com a mesma explicação, e os dois lados recebem um aviso no celular.</p>
    </>),
  },
  {
    id: "entrega", title: "Marque o dia da entrega", img: "agendar", alt: "Pedido em trânsito com o formulário Reagendar aberto, com dia e horário",
    cap: "Agendar / Reagendar entrega",
    body: (<>
      <p>Em qualquer pedido novo ou em trânsito, toque em <b>📅 Agendar entrega</b>, escolha o <b>dia</b> e, se quiser, escreva o horário (“entre 14h e 18h”). Ao salvar, o cliente recebe o aviso e vê a data em <i>Minha conta</i>.</p>
      <ul>
        <li>Pedidos com entrega <b>hoje</b> aparecem em destaque e no filtro <i>📅 Entrega hoje</i>.</li>
        <li>Se a data passou e o pedido ainda não foi entregue, ele fica marcado como <b>atrasado</b>, com um alerta no topo.</li>
        <li>O botão do WhatsApp inclui a data prevista na mensagem.</li>
      </ul>
    </>),
  },
  {
    id: "devolucao", title: "Devolução rápida: pedido + quantidade", img: "devolucao", alt: "Caixa Devolução rápida com o número do pedido, quantidade por item e a opção não repor",
    cap: "Devolução rápida",
    body: (<>
      <p>Cliente devolveu algo? Abra <b>↩ Devolução rápida</b>, digite o <b>número do pedido</b> e toque em <i>Buscar pedido</i> (ou use o botão <i>Devolução</i> no próprio pedido).</p>
      <ol className="mini">
        <li>Informe <b>quantas unidades de cada item</b> voltaram — um pedido pode ter vários itens e a devolução pode ser parcial.</li>
        <li>Se o produto veio com defeito, marque <b>não repor (defeito)</b>: ele é descartado e <u>não volta</u> ao estoque.</li>
        <li>Escreva o motivo (opcional) e toque em <b>Registrar devolução</b>.</li>
      </ol>
      <p>O que foi reposto volta ao estoque na hora, e o histórico fica no pedido. Quando tudo é devolvido, o pedido vira <i>Devolvido</i>. Só pedidos <i>em trânsito</i> ou <i>entregues</i> aceitam devolução.</p>
    </>),
  },
  {
    id: "app-dono", title: "Instale o app e ligue os avisos",
    body: (<>
      <p>O Expositor funciona como app: no Android, toque em <b>Instalar</b> no banner (ou menu do navegador → <i>Instalar app</i>). No iPhone, toque em <i>Compartilhar → Adicionar à Tela de Início</i>.</p>
      <p>Depois, abra o menu do seu perfil e toque em <b>🔔 Ativar avisos</b>. Você será avisado de <b>novo pedido</b>, de <b>entrega confirmada</b> pelo cliente e de <b>cancelamento</b>.</p>
      <Tip>No iPhone, os avisos só funcionam depois de instalar o app pela Tela de Início.</Tip>
    </>),
  },
];

const buyer: Step[] = [
  {
    id: "c-escolher", title: "Escolha os produtos", img: "filtros", alt: "Vitrine filtrada pela categoria Calçados, com chips de tipo, etiquetas, ordenação e produtos",
    cap: "Filtros da vitrine",
    body: (<>
      <p>Abra o link da loja. Use a <b>busca</b> e os filtros de <b>categoria</b>, <b>tipo/modelo</b> e <b>etiquetas</b> para achar o que procura; dá para ordenar por preço e mostrar só o que está disponível. Os cartões já mostram o preço, quantas cores e os números disponíveis. Produtos esgotados ficam marcados.</p>
    </>),
  },
  {
    id: "c-produto", title: "Veja o produto e escolha cor e número", img: "produto", alt: "Página do produto com seleção de cor e número, número esgotado riscado",
    cap: "Página do produto",
    body: (<>
      <p>Deslize as fotos e escolha a <b>cor</b> — a foto muda para a cor escolhida. Depois escolha o <b>número ou tamanho</b>: o que estiver <s>riscado</s> está esgotado nessa cor.</p>
      <p>Com tudo escolhido, o botão da base muda para <b>Adicionar ao pedido</b>. Veja também as formas de pagamento e entrega da loja e as avaliações de outros clientes.</p>
    </>),
  },
  {
    id: "c-cadastro", title: "Entre e complete seu cadastro (só uma vez)", img: "conta-dados", alt: "Tela Minha conta com os dados para pedidos: nome, WhatsApp, CEP e endereço",
    cap: "Minha conta → Meus dados para pedidos",
    body: (<>
      <p>Entre com o Google e preencha <b>nome, WhatsApp com DDD e endereço</b>. Esses dados vão junto com o pedido para a loja saber para onde entregar — e só para as lojas em que você pedir.</p>
    </>),
  },
  {
    id: "c-enviar", title: "Revise e envie pelo WhatsApp", img: "carrinho", alt: "Janela Seu pedido com itens, escolha entre receber em casa ou retirar, frete de R$ 12,00, total e o botão Enviar pedido pelo WhatsApp",
    cap: "Seu pedido, com o frete",
    body: (<>
      <p>Toque em <b>🛒 Ver pedido</b>, ajuste as quantidades, escreva observações (forma de pagamento, retirada, horário) e toque em <b>Enviar pedido pelo WhatsApp</b>. A mensagem já vai pronta para a loja.</p>
      <p>No carrinho você vê o <b>frete</b> do seu endereço (grátis, com valor ou “a combinar”) e, se a loja aceitar, pode escolher <b>retirar na loja</b>. Se a loja não entrega na sua cidade, o carrinho avisa antes de enviar.</p>
      <p>O pedido fica registrado em <i>Minha conta</i> e as unidades são <b>reservadas para você</b>. O pagamento é combinado direto com a loja.</p>
    </>),
  },
  {
    id: "c-acompanhar", title: "Acompanhe e confirme o recebimento", img: "conta-pedidos", alt: "Pedidos a caminho com a data prevista e o botão Recebi meu pedido",
    cap: "Minha conta → Meus pedidos",
    body: (<>
      <div className="flow" aria-label="Caminho do pedido">
        <span className="status novo">Aguardando a loja</span><i>→</i><span className="status aprovado">Aprovado</span><i>→</i><span className="status enviado">A caminho</span><i>→</i><span className="status finalizado">Entregue</span>
      </div>
      <p>Quando a loja marcar a entrega, você vê o <b>dia previsto</b> no pedido e recebe um aviso. Ao receber, toque em <b>Recebi meu pedido</b>. Se você esquecer, ele é marcado como entregue sozinho depois de 7 dias.</p>
      <p>Mudou de ideia? Em <i>Aguardando a loja</i>, toque em <b>Cancelar este pedido…</b>, escolha o motivo e confirme — as unidades voltam ao estoque e a loja é avisada. Depois que a loja aprova, fale com ela para cancelar. Se a <b>loja</b> cancelar, você é avisado e vê quem cancelou e o motivo; o pedido continua no seu histórico como <i>Cancelado</i>.</p>
    </>),
  },
  {
    id: "c-avaliar", title: "Avalie a loja e os produtos",
    body: (<>
      <p>Depois que o pedido está <b>entregue</b>, aparecem os campos para dar <b>estrelas e comentário</b> para a loja e para cada produto. Só quem comprou pode avaliar, e a nota ajuda outros clientes.</p>
    </>),
  },
  {
    id: "c-app", title: "Instale o app e receba avisos",
    body: (<>
      <p>Instale o Expositor na tela inicial (Android: <b>Instalar</b>; iPhone: <i>Compartilhar → Adicionar à Tela de Início</i>) e, em <i>Minha conta</i>, toque em <b>Ativar avisos</b> para saber quando o pedido sair para entrega e qual dia foi combinado.</p>
    </>),
  },
];

const faq: { q: string; a: ReactNode }[] = [
  { q: "O estoque diminui quando?", a: <>No momento em que o cliente envia o pedido (reserva). Cancelar o pedido novo ou registrar uma devolução com reposição devolve as unidades.</> },
  { q: "Qual a diferença entre estoque vazio e estoque 0?", a: <><b>Vazio</b> é “sem controle”: sempre disponível. <b>0</b> é esgotado: o produto ou a combinação não pode ser pedido.</> },
  { q: "Como mostro “sob consulta” em vez do preço?", a: <>Deixe o preço vazio ou coloque 0. A vitrine mostra “Sob consulta” e o cliente combina o valor pelo WhatsApp.</> },
  { q: "O cliente não confirmou a entrega. E agora?", a: <>Nada a fazer: 7 dias depois do envio o pedido vira <i>Entregue</i> sozinho. Você também pode marcar como entregue na aba Pedidos.</> },
  { q: "Marquei como enviado por engano.", a: <>Se o cliente não recebeu, use <i>Marcar como entregue</i> só quando entregar. Para desfazer a saída, registre uma <i>Devolução</i> com reposição dos itens.</> },
  { q: "Posso ter mais de uma loja?", a: <>Sim. Use <i>+ Novo catálogo</i> no painel. Cada catálogo tem endereço, produtos e pedidos próprios.</> },
  { q: "Meus dados e meu Drive estão seguros?", a: <>O app só acessa as fotos que você escolhe e nunca altera seus arquivos. Dados do cliente só vão para as lojas onde ele pede. Veja a <Link href="/privacidade">Privacidade</Link>.</> },
];

export default function Ajuda() {
  return (
    <>
      <SiteHeader />
      <main className="wrap help">
        <header className="hhero">
          <h1>Como usar o Expositor</h1>
          <p>Passo a passo com as telas do app — para quem vende e para quem compra.</p>
          <nav className="hnav" aria-label="Seções da ajuda">
            <a href="#lojistas">🏬 Sou lojista</a>
            <a href="#clientes">🛍️ Sou cliente</a>
            <a href="#duvidas">❓ Dúvidas</a>
            <a href="#problemas">🛠️ Problemas</a>
          </nav>
        </header>

        <section id="lojistas" className="hsec">
          <div className="hsh"><span>🏬</span><div><h2>Para lojistas</h2><p className="muted">Do cadastro da loja até a entrega e a devolução.</p></div></div>
          <details className="tocbox">
            <summary>📋 Ir direto para um passo</summary>
            <nav className="toc" aria-label="Passos para lojistas">
              {owner.map((s, i) => <a key={s.id} href={`#${s.id}`}><b>{i + 1}</b> {s.title}</a>)}
            </nav>
          </details>
          <Steps items={owner} />
        </section>

        <section id="clientes" className="hsec">
          <div className="hsh"><span>🛍️</span><div><h2>Para clientes</h2><p className="muted">Do primeiro pedido até avaliar a loja.</p></div></div>
          <details className="tocbox">
            <summary>📋 Ir direto para um passo</summary>
            <nav className="toc" aria-label="Passos para clientes">
              {buyer.map((s, i) => <a key={s.id} href={`#${s.id}`}><b>{i + 1}</b> {s.title}</a>)}
            </nav>
          </details>
          <Steps items={buyer} />
        </section>

        <section id="duvidas" className="hsec">
          <div className="hsh"><span>❓</span><div><h2>Dúvidas frequentes</h2></div></div>
          <div className="faq">
            {faq.map((f) => (
              <details key={f.q} className="card"><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </section>

        <section id="problemas" className="hsec">
          <div className="hsh"><span>🛠️</span><div><h2>Problemas comuns</h2></div></div>
          <div className="card note">
            <h3>“Erro 403: access_denied” ou “não concluiu o processo de verificação do Google”</h3>
            <p>O app do Google ainda está em <b>modo de teste</b>, e só contas aprovadas pelo desenvolvedor conseguem entrar.</p>
            <p><b>Se você é o dono do sistema:</b> abra o <a href="https://console.cloud.google.com/auth/audience" target="_blank" rel="noopener">Google Auth Platform → Público</a> e clique em <i>Publicar app</i> (status “Em produção”). Para liberar só algumas pessoas por enquanto, adicione os e-mails em <i>Usuários de teste</i>.</p>
            <p><b>Se você é cliente ou lojista:</b> peça ao administrador da plataforma para liberar sua conta ou publicar o app.</p>
          </div>
          <div className="card note">
            <h3>Aviso “O Google não verificou este app”</h3>
            <p>Em modo de teste isso é normal: toque em <i>Avançado → Acessar Expositor (não seguro)</i> e continue. Depois de publicado, o aviso não aparece.</p>
          </div>
          <div className="card note">
            <h3>As fotos não aparecem depois de reconectar o Drive</h3>
            <p>O app só enxerga as fotos que você escolheu pelo Google. Se um produto ficou sem imagem, abra <i>Importar do Drive</i> e escolha a foto de novo.</p>
          </div>
          <div className="card note">
            <h3>Não consigo avaliar uma loja</h3>
            <p>A avaliação só é liberada depois que você confirma o recebimento (ou a loja marca como <b>entregue</b>).</p>
          </div>
          <div className="card note">
            <h3>Não recebo os avisos no celular</h3>
            <p>Confirme que tocou em <b>Ativar avisos</b> e que o navegador permitiu notificações para este site. No iPhone, instale antes o app pela Tela de Início. Se o administrador ainda não configurou as chaves de aviso, o app funciona normalmente, só sem avisos.</p>
          </div>
        </section>
      </main>
    </>
  );
}
