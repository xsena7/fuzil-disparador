// Modelos prontos do Fuzil para agilizar a criação de templates (a pessoa edita o que quiser antes de enviar).
// Todos são de UTILIDADE: avisam algo sobre uma ação da pessoa, sem oferta nem promoção.

export type PresetButton = { type: "URL_TRACKED" | "URL" | "QUICK_REPLY" | "PHONE_NUMBER"; text: string };
export type TemplatePreset = {
  key: string;
  label: string;
  name: string;
  /** Cabeçalho de mídia: a pessoa escolhe o arquivo de exemplo no formulário */
  headerType?: "IMAGE" | "VIDEO" | "DOCUMENT";
  /** Arquivo de exemplo já pronto (em /public), carregado sozinho no formulário */
  sampleUrl?: string;
  headerText?: string;
  body: string;
  examples: string[];
  footer?: string;
  buttons: PresetButton[];
};

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    key: "pedido_imagem",
    label: "fuzil_utilidade1 · pedido com imagem",
    name: "fuzil_utilidade1",
    headerType: "IMAGE",
    sampleUrl: "/modelos/atualizacao-pedido.jpg",
    body: "Olá {{1}},\n\nInformamos uma atualização em seu pedido {{2}}.\n\n{{3}}\n\n{{4}}\n\nToque no botão abaixo para ver mais informações.",
    examples: ["João", "56156612", "Atualização no seu pedido", "Saiu para entrega"],
    buttons: [{ type: "URL_TRACKED", text: "Detalhes" }],
  },
  {
    key: "pedido",
    label: "Atualização de pedido",
    name: "atualizacao_pedido",
    body: "Olá {{1}}, seu pedido {{2}} foi atualizado.\n\nStatus atual: *{{3}}*.\n\nAcompanhe todos os detalhes pelo botão abaixo.",
    examples: ["Maria", "#48213", "Em separação"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Acompanhar pedido" }],
  },
  {
    key: "entrega",
    label: "Aviso de entrega",
    name: "aviso_entrega",
    body: "Olá {{1}}, a entrega do seu pedido {{2}} está a caminho e a previsão de chegada é {{3}}.\n\nVocê pode acompanhar o trajeto pelo botão abaixo.",
    examples: ["Maria", "#48213", "25/10"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Rastrear entrega" }],
  },
  {
    key: "cadastro",
    label: "Confirmação de cadastro",
    name: "confirmacao_cadastro",
    body: "Olá {{1}}, recebemos o seu cadastro.\n\nPara concluir, confirme seus dados pelo botão abaixo. Se não foi você, ignore esta mensagem.",
    examples: ["Maria"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Confirmar dados" }],
  },
  {
    key: "candidatura",
    label: "Candidatura recebida",
    name: "candidatura_recebida",
    body: "Olá {{1}}, sua candidatura para a vaga de *{{2}}* foi recebida e está em análise.\n\nAcompanhe o andamento do seu processo pelo botão abaixo.",
    examples: ["Maria", "Suporte Técnico"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Acompanhar processo" }],
  },
  {
    key: "agendamento",
    label: "Lembrete de agendamento",
    name: "lembrete_agendamento",
    body: "Olá {{1}}, este é um lembrete do seu agendamento no dia {{2}} às {{3}}.\n\nSe precisar remarcar, use o botão abaixo.",
    examples: ["Maria", "25/10", "14h"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Ver agendamento" }],
  },
  {
    key: "pagamento",
    label: "Pagamento confirmado",
    name: "pagamento_confirmado",
    body: "Olá {{1}}, confirmamos o pagamento de {{2}} referente a {{3}}.\n\nGuarde esta mensagem como comprovante.",
    examples: ["Maria", "R$ 89,90", "pedido #48213"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Ver comprovante" }],
  },
  {
    key: "fatura",
    label: "Fatura disponível",
    name: "fatura_disponivel",
    body: "Olá {{1}}, a fatura {{2}} com vencimento em {{3}} já está disponível.\n\nVeja os detalhes pelo botão abaixo.",
    examples: ["Maria", "#2026-10", "30/10"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Ver fatura" }],
  },
  {
    key: "conta",
    label: "Atualização na conta",
    name: "atualizacao_conta",
    body: "Olá {{1}}, houve uma atualização nos dados da sua conta em {{2}}.\n\nConfira os detalhes pelo botão abaixo.",
    examples: ["Maria", "21/10"],
    footer: "Mensagem automática",
    buttons: [{ type: "URL_TRACKED", text: "Ver detalhes" }],
  },
  {
    key: "protocolo",
    label: "Protocolo de atendimento",
    name: "protocolo_atendimento",
    body: "Olá {{1}}, seu atendimento foi registrado com o protocolo *{{2}}*.\n\nSe precisar de algo, é só responder esta mensagem.",
    examples: ["Maria", "2026102145"],
    footer: "Mensagem automática",
    buttons: [{ type: "QUICK_REPLY", text: "Recebi" }],
  },
];
