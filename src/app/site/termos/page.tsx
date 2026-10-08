import type { Metadata } from "next";
import { company, ownerLine } from "@/lib/company";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Termos de Uso · Fuzil Disparador" };

export default function TermsPage() {
  const c = company();
  return (
    <LegalPage title="Termos de Uso" updated="08/10/2026">
      <p>
        Estes Termos regulam o uso do <b>{c.brand}</b>, software fornecido por {ownerLine()}. Ao criar uma conta ou usar a Plataforma, você concorda
        com estes Termos e com a nossa <a href="/privacidade" className="text-brand-600 underline">Política de Privacidade</a>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        A Plataforma permite conectar contas do WhatsApp Business, cadastrar modelos de mensagem, importar listas de contatos e enviar mensagens pela
        API oficial do WhatsApp (Cloud API), com métricas e alertas. O envio depende da Meta, que pode aprovar, recusar, recategorizar modelos, limitar
        ou suspender contas segundo as regras dela.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>O acesso é pessoal. Você é responsável por manter sua senha em sigilo e por tudo o que for feito com seu usuário.</li>
        <li>As informações de cadastro devem ser verdadeiras e atualizadas.</li>
      </ul>

      <h2>3. Uso permitido</h2>
      <p>Você se compromete a:</p>
      <ul>
        <li>Enviar mensagens somente para pessoas que autorizaram receber contato da sua empresa pelo WhatsApp (opt-in), conforme a LGPD e as políticas do WhatsApp.</li>
        <li>Cumprir a Política Comercial do WhatsApp, a Política de Mensagens do WhatsApp Business e os Termos da Meta.</li>
        <li>Usar apenas modelos de mensagem aprovados pela Meta e com conteúdo legítimo, verdadeiro e relacionado à sua empresa.</li>
        <li>Respeitar pedidos de descadastro. A Plataforma bloqueia automaticamente quem responde SAIR, PARAR ou STOP.</li>
      </ul>
      <p>É proibido usar a Plataforma para spam, golpes, phishing, conteúdo ilegal, enganoso, ofensivo ou que viole direitos de terceiros, ou para contornar limites e regras da Meta.</p>

      <h2>4. Créditos e pagamento</h2>
      <p>
        O envio consome créditos conforme o valor por mensagem combinado com você. Mensagens que falham são estornadas automaticamente. As cobranças
        da própria Meta pelo uso da API são feitas diretamente na conta do WhatsApp Business do Cliente, conforme a tabela da Meta.
      </p>

      <h2>5. Responsabilidades</h2>
      <ul>
        <li>O Cliente é o responsável pelo conteúdo das mensagens, pelas listas de contatos e pela base legal para o contato.</li>
        <li>Não nos responsabilizamos por bloqueios, restrições ou mudanças de limite aplicados pela Meta, nem por indisponibilidade dos serviços dela.</li>
        <li>Fazemos o possível para manter a Plataforma disponível e segura, mas ela é fornecida &quot;no estado em que se encontra&quot;, podendo passar por manutenções.</li>
      </ul>

      <h2>6. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos ou as políticas da Meta, ou por inadimplência. O Cliente pode pedir o encerramento
        da conta a qualquer momento; os dados serão excluídos conforme a Política de Privacidade.
      </p>

      <h2>7. Alterações e foro</h2>
      <p>
        Estes Termos podem ser atualizados; a versão vigente fica nesta página. Aplica-se a legislação brasileira, ficando eleito o foro do domicílio
        do fornecedor, salvo disposição legal em contrário.
      </p>

      <h2>8. Contato</h2>
      <p>{c.email || "Use o contato informado no rodapé deste site."}{c.phone ? ` · ${c.phone}` : ""}</p>
    </LegalPage>
  );
}
