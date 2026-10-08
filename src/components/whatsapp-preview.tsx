import { ExternalLink, ImageIcon, Phone, Reply, FileText, Video } from "lucide-react";

export type PreviewData = {
  headerType?: string | null;
  headerText?: string;
  headerMediaUrl?: string | null;
  body: string;
  footer?: string;
  buttons: Array<{ type: string; text: string }>;
};

function formatWa(text: string) {
  // *negrito*, _itálico_, ~riscado~
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return parts.map((p, i) => {
    if (/^\*[^*]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^~[^~]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>;
    return <span key={i}>{p}</span>;
  });
}

export function WhatsAppPreview({ data }: { data: PreviewData }) {
  const media = data.headerType && ["IMAGE", "VIDEO", "DOCUMENT"].includes(data.headerType);
  return (
    <div className="mx-auto w-72 overflow-hidden rounded-[2rem] border-8 border-zinc-800 bg-[#efeae2] shadow-xl">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
        <div className="size-7 rounded-full bg-white/30" />
        <div><div className="text-xs font-semibold">Contato</div><div className="text-[10px] opacity-80">online</div></div>
      </div>
      <div className="min-h-80 p-2.5">
        <div className="mx-auto mb-2 w-fit rounded bg-white px-2 py-0.5 text-[10px] text-zinc-500">HOJE</div>
        <div className="max-w-[95%] rounded-lg rounded-tl-none bg-white p-1 shadow-sm">
          {media && (
            data.headerMediaUrl && data.headerType === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.headerMediaUrl} alt="" className="mb-1 max-h-40 w-full rounded object-cover" />
            ) : (
              <div className="mb-1 flex h-28 flex-col items-center justify-center gap-1 rounded bg-zinc-100 text-[10px] text-zinc-400">
                {data.headerType === "VIDEO" ? <Video className="size-6" /> : data.headerType === "DOCUMENT" ? <FileText className="size-6" /> : <ImageIcon className="size-6" />}
                Mídia definida no envio
              </div>
            )
          )}
          <div className="px-1.5 pb-1 text-[12.5px] leading-snug">
            {data.headerType === "TEXT" && data.headerText && <div className="mb-1 font-semibold">{data.headerText}</div>}
            <div className="whitespace-pre-wrap break-words">{formatWa(data.body || "Sua mensagem aparece aqui")}</div>
            {data.footer && <div className="mt-1 text-[11px] text-zinc-500">{data.footer}</div>}
            <div className="text-right text-[10px] text-zinc-400">11:30 ✓✓</div>
          </div>
        </div>
        {data.buttons.map((b, i) => (
          <div key={i} className="mt-0.5 flex max-w-[95%] items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[12.5px] font-medium text-sky-600 shadow-sm">
            {b.type.startsWith("URL") ? <ExternalLink className="size-3.5" /> : b.type === "PHONE_NUMBER" ? <Phone className="size-3.5" /> : <Reply className="size-3.5" />}
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );
}
