import Link from "next/link";
export default function NotFound() {
  return <main className="center"><div className="card narrow"><h1>Catálogo não encontrado</h1><Link className="btn primary" href="/">Buscar lojas</Link></div></main>;
}
