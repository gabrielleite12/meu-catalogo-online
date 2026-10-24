"use client";
import { useFormStatus } from "react-dom";

/** Botão de envio que mostra "carregando" enquanto a Server Action do formulário roda. */
export default function SubmitButton({ children, pendingText = "Aguarde…", className = "btn", confirm, ...rest }: {
  children: React.ReactNode; pendingText?: string; className?: string; name?: string; value?: string; confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} className={className} disabled={pending} onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}>
      {pending && <span className="spin" />}{pending ? pendingText : children}
    </button>
  );
}
