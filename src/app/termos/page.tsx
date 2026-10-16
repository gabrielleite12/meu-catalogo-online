import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";

export const metadata = { title: "Termos de Serviço — Expositor" };

export default function Termos() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <h1>Termos de Serviço</h1>
        <p className="muted">Última atualização: 16 de outubro de 2026</p>

        <h2>1. O serviço</h2>
        <p>O Expositor permite que lojistas criem catálogos online com suas fotos e recebam pedidos pelo WhatsApp, e que clientes consultem catálogos, façam pedidos e avaliem lojas. Ao usar o serviço, você concorda com estes termos.</p>

        <h2>2. Somos uma vitrine</h2>
        <p>O Expositor <b>não processa pagamentos, não entrega produtos e não é parte das vendas</b>. Preço, pagamento, entrega, troca e garantia são combinados diretamente entre cliente e loja. A loja é a única responsável pelos produtos, preços, estoque e atendimento.</p>

        <h2>3. Conta e conteúdo</h2>
        <ul>
          <li>O acesso é feito com conta Google. Você é responsável pelas informações que cadastra.</li>
          <li>Lojistas só devem publicar fotos e informações que tenham o direito de usar, e não podem anunciar produtos ilegais ou enganosos.</li>
          <li>Avaliações só podem ser feitas por clientes com pedido finalizado e devem refletir a experiência real. Podemos remover conteúdo ofensivo ou fraudulento.</li>
        </ul>

        <h2>4. Google Drive</h2>
        <p>As fotos permanecem no seu Google Drive. O app acessa apenas as fotos que você escolher, conforme a <Link href="/privacidade">Política de Privacidade</Link>. Se você apagar uma foto do Drive ou revogar o acesso, ela deixa de aparecer no catálogo.</p>

        <h2>5. Disponibilidade</h2>
        <p>O serviço é oferecido “como está”, sem garantia de funcionamento ininterrupto. Podemos alterar, suspender ou encerrar contas que violem estes termos.</p>

        <h2>6. Limitação de responsabilidade</h2>
        <p>Não nos responsabilizamos por negociações entre clientes e lojas, nem por perdas decorrentes do uso ou da indisponibilidade do serviço, na extensão permitida pela lei.</p>

        <h2>7. Contato</h2>
        <p><a href="mailto:bielleite59@gmail.com">bielleite59@gmail.com</a></p>
      </main>
    </>
  );
}
