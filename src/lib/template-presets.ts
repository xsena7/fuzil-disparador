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
    label: "fuzil_utilidade1",
    name: "fuzil_utilidade1",
    headerType: "IMAGE",
    sampleUrl: "/modelos/atualizacao-pedido.jpg",
    body: "Olá {{1}},\n\nInformamos uma atualização em seu pedido {{2}}.\n\n{{3}}\n\n{{4}}\n\nToque no botão abaixo para ver mais informações.",
    examples: ["João", "56156612", "Atualização no seu pedido", "Saiu para entrega"],
    buttons: [{ type: "URL_TRACKED", text: "Detalhes" }],
  },
];
