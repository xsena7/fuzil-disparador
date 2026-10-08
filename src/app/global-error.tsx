"use client";

/** Último recurso: erro fora do painel (ex.: página carregada antes de uma atualização do servidor). */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f6f8", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ background: "#fff", padding: 32, borderRadius: 16, maxWidth: 420, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>O painel precisa ser recarregado</div>
          <p style={{ color: "#71717a", fontSize: 14 }}>Provavelmente saiu uma versão nova enquanto a página estava aberta.</p>
          {error.digest && <p style={{ color: "#a1a1aa", fontSize: 12, fontFamily: "monospace" }}>código {error.digest}</p>}
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, background: "linear-gradient(90deg,#f97316,#e11d48)", color: "#fff", border: 0, borderRadius: 12, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}>
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
