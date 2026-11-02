import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Como funciona — Vitrine Zap",
  description: "Passo a passo com telas: criar o catálogo, cadastrar produtos e estoque, configurar fretes, atender pedidos, agendar entregas, devoluções e como comprar.",
  alternates: { canonical: "/ajuda" },
  openGraph: { title: "Como funciona — Vitrine Zap", description: "Crie seu catálogo com fotos do Google Drive e receba pedidos pelo WhatsApp.", type: "website" as const },
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

const Ex = ({ children, title = "Exemplo" }: { children: ReactNode; title?: string }) => (
  <div className="hex"><b>📌 {title}</b><div>{children}</div></div>
);

const story: { who: "loja" | "cliente" | "app"; t: string; d: ReactNode }[] = [
  { who: "loja", t: "Maria monta a loja", d: <>Ela entra com o Google, cria o catálogo <b>Sapatos da Maria</b> (endereço <code>/sapatos-da-maria</code>) e informa seu WhatsApp.</> },
  { who: "loja", t: "Maria cadastra um tênis", d: <>Importa a foto do Drive, escreve o nome <b>Tênis Corrida</b>, preço <b>R$ 199,90</b> e cria as variações <code>Número: 37, 38</code> × <code>Cor: Preto, Branco</code>, com <b>5 unidades</b> de cada.</> },
  { who: "cliente", t: "Ana encontra e escolhe", d: <>Ana abre o link da loja, toca no tênis, escolhe <b>Preto</b> e <b>número 38</b> e toca em <i>Adicionar ao pedido</i>. Depois escolhe <b>Branco, 37</b> e adiciona também: ficam <b>2 linhas</b> no pedido.</> },
  { who: "cliente", t: "Ana envia o pedido", d: <>No carrinho ela vê o frete do endereço dela (ex.: R$ 12,00) e toca em <i>Enviar pedido pelo WhatsApp</i>. A mensagem já vai pronta para a Maria.</> },
  { who: "app", t: "O estoque é reservado", d: <>Na hora, o Preto 38 passa de 5 para <b>4</b> e o Branco 37 também. Ninguém consegue comprar a mesma unidade duas vezes.</> },
  { who: "loja", t: "Maria atende", d: <>Em <i>Pedidos</i> ela toca em <b>Aprovar</b>, combina o pagamento pelo WhatsApp, marca <b>Enviado</b> e agenda a entrega para sexta-feira.</> },
  { who: "cliente", t: "Ana recebe e avalia", d: <>Ana recebe o aviso, toca em <b>Recebi meu pedido</b> e deixa 5 estrelas para a loja e para o tênis.</> },
];

const glossary: [string, ReactNode][] = [
  ["Catálogo / loja", <>A sua vitrine na internet, com endereço próprio (ex.: <code>/sapatos-da-maria</code>).</>],
  ["Variação", <>Uma combinação de opções do mesmo produto, como <i>38 / Preto</i>. Cada uma tem o seu estoque.</>],
  ["SKU", <>Código interno que você inventa para achar o produto (ex.: <code>TEN-001</code>). É opcional.</>],
  ["Sob consulta", <>Produto sem preço na vitrine: o cliente pergunta o valor pelo WhatsApp.</>],
  ["Reserva de estoque", <>As unidades ficam separadas para o cliente assim que ele envia o pedido, antes de você aprovar.</>],
  ["Em trânsito", <>O pedido já saiu da loja e ainda não foi entregue.</>],
  ["Devolução", <>O cliente devolveu itens. Você escolhe se eles voltam ao estoque ou são descartados (defeito).</>],
  ["Aviso (notificação)", <>Mensagem que aparece no celular quando algo acontece no pedido. Precisa ativar em <i>Minha conta</i>.</>],
];

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
      <Ex>Nome: <b>Sapatos da Maria</b> → endereço <code>/sapatos-da-maria</code>. WhatsApp: <code>(11) 91234-5678</code>. Pagamento: <i>Pix, cartão</i>. Entrega: <i>Correios, retirada</i>.</Ex>
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
      <Ex>Você escolhe 3 fotos do mesmo tênis (preto, branco e azul) e toca em <i>Juntar em um produto</i>: nasce <b>1 produto</b> com 3 fotos. Se escolhesse “um por foto”, nasceriam 3 produtos.</Ex>
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
      <Ex>Filtro <i>Estoque baixo</i> mostra o “Tênis Corrida” porque restam 2 unidades; filtro <i>Sem estoque</i> mostra o que chegou a 0. Digitando <code>TEN-001</code> na busca, você acha o produto pelo SKU.</Ex>
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
      <Ex><b>Tênis Corrida</b>, categoria <i>Calçados</i>, tipo <i>Tênis</i>, etiquetas <i>#masculino #corrida</i>, preço <b>R$ 199,90</b>. Uma camiseta de preço “só pelo WhatsApp”? Deixe o preço em branco.</Ex>
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
      <Ex title="Exemplo de grade">
        <table className="htable">
          <thead><tr><th>Variação</th><th>Estoque</th><th>Preço</th></tr></thead>
          <tbody>
            <tr><td>37 / Preto</td><td>5</td><td>199,90</td></tr>
            <tr><td>38 / Preto</td><td>0 <small>(esgotado)</small></td><td>199,90</td></tr>
            <tr><td>38 / Branco</td><td><i>vazio</i> <small>(sempre disponível)</small></td><td>219,90</td></tr>
          </tbody>
        </table>
        O cliente verá o <b>38 Preto riscado</b>, e o Branco por R$ 219,90.
      </Ex>
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
      <Ex title="Exemplo de regras">
        <ul>
          <li><b>São Paulo/SP:</b> grátis acima de R$ 150, senão R$ 12,00 (“entrega em 2 dias”).</li>
          <li><b>Estado de SP (resto do estado):</b> R$ 20,00.</li>
          <li><b>Todos os outros lugares:</b> a combinar pelo WhatsApp.</li>
        </ul>
        Um cliente de Campinas/SP usa a regra do <i>estado</i> (R$ 20,00); um cliente de São Paulo/SP usa a da <i>cidade</i>, que é mais específica. Um cliente do Rio cai em “todos os outros lugares”.
      </Ex>
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
      <Ex>Pedido <b>#12</b> da Ana: 1× Tênis Corrida (38 / Preto) + frete R$ 12,00. Você toca em <i>Aprovar</i>, depois em <i>Falar com o cliente</i> para combinar o Pix, e por fim em <i>Marcar como enviado</i>.</Ex>
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
      <Ex>Ana não estará em casa na quinta. Você toca em <i>Reagendar</i>, escolhe <b>sexta-feira</b> e escreve “entre 14h e 18h”. Ana recebe o aviso na hora.</Ex>
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
      <Ex>Pedido #12 tinha 2 tênis, e a Ana devolveu 1 que veio com a sola solta. Você digita <code>12</code>, coloca <b>1</b> no item, marca <i>não repor (defeito)</i> e registra. O tênis não volta ao estoque.</Ex>
      <p>O que foi reposto volta ao estoque na hora, e o histórico fica no pedido. Quando tudo é devolvido, o pedido vira <i>Devolvido</i>. Só pedidos <i>em trânsito</i> ou <i>entregues</i> aceitam devolução.</p>
    </>),
  },
  {
    id: "app-dono", title: "Instale o app e ligue os avisos",
    body: (<>
      <p>A Vitrine Zap funciona como app: no Android, toque em <b>Instalar</b> no banner (ou menu do navegador → <i>Instalar app</i>). No iPhone, toque em <i>Compartilhar → Adicionar à Tela de Início</i>.</p>
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
      <Ex>Na loja da Maria, toque em <i>Calçados</i> → <i>Tênis</i>, ordene por <i>Menor preço</i> e marque <i>Só disponíveis</i> para ver apenas o que dá para comprar agora.</Ex>
    </>),
  },
  {
    id: "c-produto", title: "Veja o produto e escolha cor e número", img: "produto", alt: "Página do produto com seleção de cor e número, número esgotado riscado",
    cap: "Página do produto",
    body: (<>
      <p>Deslize as fotos e escolha a <b>cor</b> — a foto muda para a cor escolhida. Depois escolha o <b>número ou tamanho</b>: o que estiver <s>riscado</s> está esgotado nessa cor.</p>
      <p>Com tudo escolhido, o botão da base muda para <b>Adicionar ao pedido</b>. Veja também as formas de pagamento e entrega da loja e as avaliações de outros clientes.</p>
      <Ex>Você quer o Tênis Corrida <b>Preto 38</b> e também o <b>Branco 37</b>: escolha Preto → 38 → <i>Adicionar</i>; depois escolha Branco → 37 → <i>Adicionar</i>. No carrinho aparecem as duas linhas.</Ex>
      <Tip>Quer <b>outra cor ou outro número</b> do mesmo produto? Depois de adicionar, é só escolher de novo e tocar em <i>Adicionar ao pedido</i>: cada combinação vira uma linha separada no pedido, com a sua própria quantidade. Se a combinação não existir (ex.: aquele número não vem naquela cor), a escolha do número é limpa para você escolher outro.</Tip>
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
      <Ex title="Como fica o carrinho">1× Tênis Corrida (38 / Preto) — R$ 199,90<br />1× Tênis Corrida (37 / Branco) — R$ 219,90<br />Frete — R$ 12,00 · <b>Total R$ 431,80</b></Ex>
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
      <p>Instale a Vitrine Zap na tela inicial (Android: <b>Instalar</b>; iPhone: <i>Compartilhar → Adicionar à Tela de Início</i>) e, em <i>Minha conta</i>, toque em <b>Ativar avisos</b> para saber quando o pedido sair para entrega e qual dia foi combinado.</p>
    </>),
  },
];

// `t` é o mesmo texto da resposta, em texto puro, usado nos dados estruturados (SEO).
const faq: { q: string; a: ReactNode; t: string }[] = [
  { q: "O pagamento acontece dentro do app?", a: <>Não. O app não processa pagamentos: o cliente envia o pedido pelo WhatsApp e <b>o pagamento é combinado direto com a loja</b> (Pix, cartão, dinheiro…).</>, t: "Não. O app não processa pagamentos: o cliente envia o pedido pelo WhatsApp e o pagamento é combinado direto com a loja." },
  { q: "O estoque diminui quando?", a: <>No momento em que o cliente envia o pedido (reserva). Cancelar o pedido (a loja, em qualquer etapa até a entrega; o cliente, enquanto está aguardando a loja) ou registrar uma devolução com reposição devolve as unidades.</>, t: "No momento em que o cliente envia o pedido (reserva). Cancelar o pedido ou registrar uma devolução com reposição devolve as unidades." },
  { q: "Qual a diferença entre estoque vazio e estoque 0?", a: <><b>Vazio</b> é “sem controle”: sempre disponível. <b>0</b> é esgotado: o produto ou a combinação não pode ser pedido.</>, t: "Vazio é sem controle: sempre disponível. 0 é esgotado: o produto ou a combinação não pode ser pedido." },
  { q: "Como mostro “sob consulta” em vez do preço?", a: <>Deixe o preço vazio ou coloque 0. A vitrine mostra “Sob consulta” e o cliente combina o valor pelo WhatsApp.</>, t: "Deixe o preço vazio ou coloque 0. A vitrine mostra Sob consulta e o cliente combina o valor pelo WhatsApp." },
  { q: "Como o frete é calculado?", a: <>Pela <b>cidade e estado do cadastro do cliente</b>, seguindo as regras da aba Fretes (a mais específica vale). Você escolhe se o frete é somado ao total ou só informado. Sem regras, aparece “a combinar com a loja”.</>, t: "Pela cidade e estado do cadastro do cliente, seguindo as regras da aba Fretes. Você escolhe se o frete é somado ao total ou só informado. Sem regras, aparece a combinar com a loja." },
  { q: "O cliente pode pedir mais de uma cor ou número do mesmo produto?", a: <>Pode. Cada combinação escolhida entra como uma linha própria no pedido, com a sua quantidade e o estoque da própria combinação.</>, t: "Pode. Cada combinação escolhida entra como uma linha própria no pedido, com a sua quantidade e o estoque da própria combinação." },
  { q: "O cliente não confirmou a entrega. E agora?", a: <>Nada a fazer: 7 dias depois do envio o pedido vira <i>Entregue</i> sozinho. Você também pode marcar como entregue na aba Pedidos.</>, t: "Nada a fazer: 7 dias depois do envio o pedido vira Entregue sozinho. Você também pode marcar como entregue na aba Pedidos." },
  { q: "Marquei como enviado por engano.", a: <>Se o cliente não recebeu, use <i>Marcar como entregue</i> só quando entregar. Para desfazer a saída, registre uma <i>Devolução</i> com reposição dos itens.</>, t: "Se o cliente não recebeu, use Marcar como entregue só quando entregar. Para desfazer a saída, registre uma Devolução com reposição dos itens." },
  { q: "Posso ter mais de uma loja?", a: <>Sim. Use <i>+ Novo catálogo</i> no painel. Cada catálogo tem endereço, produtos e pedidos próprios.</>, t: "Sim. Use Novo catálogo no painel. Cada catálogo tem endereço, produtos e pedidos próprios." },
  { q: "Meus dados e meu Drive estão seguros?", a: <>O app só acessa as fotos que você escolhe e nunca altera seus arquivos. Dados do cliente só vão para as lojas onde ele pede. Veja a <Link href="/privacidade">Privacidade</Link>.</>, t: "O app só acessa as fotos que você escolhe e nunca altera seus arquivos. Dados do cliente só vão para as lojas onde ele pede." },
];

const quick: { n: number; t: string; d: string; href: string }[] = [
  { n: 1, t: "Entre com o Google", d: "Um toque, sem senha.", href: "#entrar" },
  { n: 2, t: "Configure a loja", d: "Nome, endereço e WhatsApp.", href: "#configurar" },
  { n: 3, t: "Importe as fotos", d: "Direto do seu Google Drive.", href: "#importar" },
  { n: 4, t: "Ajuste preço e estoque", d: "Com cor e número, se precisar.", href: "#editar" },
  { n: 5, t: "Divulgue o link", d: "E receba pedidos no WhatsApp.", href: "#pedidos" },
];

export default function Ajuda() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.t } })),
      }) }} />
      <SiteHeader />
      <main className="wrap help">
        <header className="hhero">
          <h1>Como funciona a Vitrine Zap</h1>
          <p>Passo a passo com as telas do app — para quem vende e para quem compra.</p>
          <nav className="hnav" aria-label="Seções da ajuda">
            <a href="#lojistas">🏬 Sou lojista</a>
            <a href="#clientes">🛍️ Sou cliente</a>
            <a href="#exemplo">📖 Exemplo completo</a>
            <a href="#glossario">📚 Glossário</a>
            <a href="#duvidas">❓ Dúvidas</a>
            <a href="#problemas">🛠️ Problemas</a>
          </nav>
        </header>

        <section className="quick" aria-labelledby="quick-h">
          <h2 id="quick-h">Comece em 5 passos</h2>
          <ol className="qgrid">
            {quick.map((s) => (
              <li key={s.n}><a href={s.href}><b>{s.n}</b><span><strong>{s.t}</strong><small>{s.d}</small></span></a></li>
            ))}
          </ol>
          <p className="muted center-text">Quem compra não precisa criar loja: basta abrir o link da loja, escolher e enviar o pedido. <a href="#clientes">Ver como comprar →</a></p>
        </section>

        <section id="exemplo" className="hsec">
          <div className="hsh"><span>📖</span><div><h2>Exemplo do começo ao fim</h2><p className="muted">A Maria vende tênis e a Ana faz um pedido. Veja o que cada uma faz e o que o app faz sozinho.</p></div></div>
          <ol className="story">
            {story.map((s, i) => (
              <li key={i} className={"sty " + s.who}>
                <span className="swho">{s.who === "loja" ? "🏬 Loja" : s.who === "cliente" ? "🛍️ Cliente" : "⚙️ App"}</span>
                <div><strong>{s.t}</strong><p>{s.d}</p></div>
              </li>
            ))}
          </ol>
        </section>

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

        <section id="glossario" className="hsec">
          <div className="hsh"><span>📚</span><div><h2>Palavras que aparecem no app</h2><p className="muted">Se algum termo ficou confuso, é aqui.</p></div></div>
          <dl className="gloss">
            {glossary.map(([k, v]) => (<div key={k} className="card"><dt>{k}</dt><dd>{v}</dd></div>))}
          </dl>
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
            <p>Em modo de teste isso é normal: toque em <i>Avançado → Acessar Vitrine Zap (não seguro)</i> e continue. Depois de publicado, o aviso não aparece.</p>
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
          <div className="card note">
            <h3>“Estoque insuficiente” ou “item não está mais disponível” ao enviar o pedido</h3>
            <p>Outra pessoa pode ter pedido a última unidade enquanto você escolhia. Feche o pedido, atualize a página e confira a disponibilidade da cor e do número. O estoque é conferido e reservado no momento do envio.</p>
          </div>
          <div className="card note">
            <h3>Não consigo escolher outra cor ou número do mesmo produto</h3>
            <p>Escolha a <b>cor</b> e depois o <b>número</b>. Se aquele número não existe na cor escolhida, ele é limpo e você escolhe outro — números riscados estão esgotados. Para levar mais de uma combinação, adicione uma de cada vez: cada uma vira uma linha no pedido.</p>
          </div>
          <div className="card note">
            <h3>O frete aparece como “a combinar” ou o carrinho diz que a loja não entrega</h3>
            <p>O frete usa a <b>cidade e o estado do seu cadastro</b> (<i>Minha conta</i>). Confira se o endereço está completo. Se a loja não entrega na sua cidade, escolha <i>Retirar na loja</i> (quando disponível) ou fale com ela pelo WhatsApp. <b>Lojistas:</b> revise as regras na aba Fretes.</p>
          </div>
          <div className="card note">
            <h3>O produto sumiu da vitrine</h3>
            <p>Ele pode estar <b>oculto</b> ou com a opção <i>Ocultar sozinho quando o estoque acabar</i> ligada e o estoque em 0. Na aba Produtos, use os filtros <i>Ocultos</i> e <i>Sem estoque</i>; ao repor o estoque ele volta sozinho.</p>
          </div>
        </section>

        <section className="hcta" aria-label="Comece agora">
          <h2>Pronto para começar?</h2>
          <p>Crie seu catálogo em minutos ou veja as lojas já publicadas.</p>
          <div className="hctab">
            <Link className="btn primary" href="/login?next=/painel">Criar meu catálogo</Link>
            <Link className="btn" href="/">Ver lojas</Link>
          </div>
        </section>
      </main>
    </>
  );
}
