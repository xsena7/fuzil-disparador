import type { Metadata } from "next";
import { company, ownerLine } from "@/lib/company";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Política de Privacidade · Fuzil Disparador" };

export default function PrivacyPage() {
  const c = company();
  const contact = c.email || "o e-mail de contato informado no rodapé deste site";
  return (
    <LegalPage title="Política de Privacidade" updated="08/10/2026">
      <p>
        Esta Política explica como o <b>{c.brand}</b> (&quot;Plataforma&quot;), produto de {ownerLine()}
        {c.address ? `, com sede em ${c.address}` : ""} (&quot;nós&quot;), coleta, usa, armazena e protege dados pessoais, em conformidade com a Lei
        Geral de Proteção de Dados (Lei nº 13.709/2018, &quot;LGPD&quot;) e com as políticas da Meta para a API do WhatsApp Business.
      </p>

      <h2>1. Quem somos e nosso papel</h2>
      <p>
        O {c.brand} é um software que permite a empresas (&quot;Clientes&quot;) conectar suas contas do WhatsApp Business e enviar mensagens pela
        API oficial do WhatsApp (Cloud API), fornecida pela Meta Platforms, Inc.
      </p>
      <ul>
        <li>Para os dados de cadastro dos Clientes e usuários do painel, somos <b>controladores</b>.</li>
        <li>Para os dados dos contatos que os Clientes importam e para quem enviam mensagens, o Cliente é o <b>controlador</b> e nós atuamos como <b>operadores</b>, tratando os dados apenas conforme as instruções do Cliente.</li>
      </ul>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><b>Cadastro e acesso ao painel:</b> nome, e-mail, senha (armazenada de forma criptografada, sem possibilidade de leitura), data do último acesso.</li>
        <li><b>Contas do WhatsApp Business conectadas:</b> identificadores da conta e do portfólio empresarial, números de telefone comerciais, nome de exibição, qualidade, limites de envio, modelos de mensagem e tokens de acesso concedidos pelo Cliente pela Meta (armazenados criptografados).</li>
        <li><b>Listas de contatos enviadas pelo Cliente:</b> número de telefone, nome e demais colunas da planilha que o Cliente decidir usar nas mensagens.</li>
        <li><b>Dados de entrega e interação:</b> status das mensagens (enviada, entregue, lida, falha), respostas recebidas e pedidos de descadastro, e cliques em links (data, endereço IP e navegador, usados para contar cliques e descartar robôs).</li>
        <li><b>Dados técnicos:</b> registros de erros e de uso do sistema, para segurança e suporte.</li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Prestar o serviço: conectar contas, cadastrar modelos, enviar mensagens e exibir métricas e relatórios ao Cliente.</li>
        <li>Cumprir as políticas do WhatsApp: respeitar descadastros, bloquear envio de modelos não permitidos e monitorar a qualidade dos números.</li>
        <li>Comunicar o Cliente sobre a conta (convites, recuperação de senha e alertas importantes).</li>
        <li>Segurança, prevenção a fraudes e cumprimento de obrigações legais.</li>
      </ul>
      <p>Bases legais (LGPD, art. 7º): execução de contrato, legítimo interesse, cumprimento de obrigação legal e, quando aplicável, consentimento obtido pelo Cliente junto aos seus contatos.</p>
      <p><b>Não vendemos dados pessoais</b> e não usamos as listas de contatos dos Clientes para nenhuma finalidade própria.</p>

      <h2>4. Dados recebidos da Meta</h2>
      <p>
        Os dados obtidos pela API do WhatsApp Business e pelo Login do Facebook (identificadores de contas, números, modelos, status e mensagens)
        são usados exclusivamente para operar a Plataforma para o Cliente que autorizou a conexão, conforme os Termos da Plataforma Meta. O Cliente
        pode remover essa autorização a qualquer momento nas configurações do seu portfólio empresarial na Meta ou excluindo a conexão no painel.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <ul>
        <li><b>Meta Platforms</b>, para o envio das mensagens pela API do WhatsApp Business.</li>
        <li>Fornecedores de infraestrutura necessários ao serviço (hospedagem em nuvem e envio de e-mails transacionais), sob obrigações de confidencialidade e segurança.</li>
        <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
      </ul>

      <h2>6. Armazenamento e segurança</h2>
      <p>
        Os dados ficam em servidores em nuvem com acesso restrito. Tokens e chaves são criptografados (AES-256), senhas são armazenadas com hash e
        todo o tráfego usa HTTPS. Cada conta de Cliente é isolada das demais.
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a conta do Cliente estiver ativa. Ao excluir uma campanha, uma conexão ou a conta, os dados correspondentes são
        apagados da Plataforma. Registros técnicos são mantidos pelo tempo necessário à segurança e ao cumprimento de obrigações legais.
      </p>

      <h2>8. Seus direitos</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, além de informações sobre
        compartilhamento e revogação de consentimento (LGPD, art. 18). Se você recebeu uma mensagem de um Cliente nosso, pode responder <b>SAIR</b> para
        não receber mais mensagens daquela empresa, ou falar diretamente com a empresa que enviou. Veja também a página de{" "}
        <a href="/exclusao-de-dados" className="text-brand-600 underline">Exclusão de dados</a>.
      </p>

      <h2>9. Contato</h2>
      <p>
        Encarregado de dados e dúvidas sobre esta Política: {contact}
        {c.phone ? ` · ${c.phone}` : ""}. Responsável: {ownerLine()}.
      </p>

      <h2>10. Alterações</h2>
      <p>Podemos atualizar esta Política. A versão vigente fica sempre nesta página, com a data da última atualização.</p>
    </LegalPage>
  );
}
