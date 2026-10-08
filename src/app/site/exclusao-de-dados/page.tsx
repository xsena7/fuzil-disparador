import type { Metadata } from "next";
import { company, ownerLine } from "@/lib/company";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Exclusão de dados · Fuzil Disparador" };

export default function DataDeletionPage() {
  const c = company();
  return (
    <LegalPage title="Instruções para exclusão de dados" updated="08/10/2026">
      <p>
        Você pode pedir a exclusão dos seus dados do <b>{c.brand}</b> ({ownerLine()}) a qualquer momento. Veja abaixo como fazer em cada caso.
      </p>

      <h2>Se você é cliente (usa o painel)</h2>
      <ul>
        <li><b>Desconectar uma conta do WhatsApp:</b> no painel, em Conexões, clique em excluir na conta. Os dados dela (números, modelos e tokens) são apagados da Plataforma.</li>
        <li><b>Remover o acesso do app na Meta:</b> no Meta Business Suite, vá em Configurações do negócio → Integrações → Aplicativos conectados (ou Parceiros) e remova o {c.brand}.</li>
        <li><b>Excluir campanhas e listas:</b> em Campanhas, use o menu ⋮ → Excluir. A lista de contatos e o relatório daquela campanha são apagados.</li>
        <li><b>Excluir a conta inteira:</b> envie um e-mail para {c.email || "o contato abaixo"} com o assunto &quot;Exclusão de conta&quot;, a partir do e-mail cadastrado. Excluímos a conta e todos os dados dela em até 15 dias e confirmamos por e-mail.</li>
      </ul>

      <h2>Se você recebeu uma mensagem de uma empresa que usa o {c.brand}</h2>
      <ul>
        <li>Responda <b>SAIR</b> na conversa: você deixa de receber mensagens daquela empresa na hora.</li>
        <li>Para excluir seu número e seus dados, fale com a empresa que enviou a mensagem (ela é a responsável pela lista) ou escreva para {c.email || "o contato abaixo"} informando o número de telefone e o nome da empresa remetente. Encaminharemos o pedido e removeremos seus dados da Plataforma em até 15 dias.</li>
      </ul>

      <h2>Contato</h2>
      <p>{c.email || "E-mail de contato em breve."}{c.phone ? ` · ${c.phone}` : ""}</p>
    </LegalPage>
  );
}
