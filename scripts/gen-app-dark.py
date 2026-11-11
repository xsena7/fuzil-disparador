# Uso: python3 scripts/gen-app-dark.py .
# Gera src/app/app-dark.css: tema escuro da plataforma (html.dk) a partir das classes realmente usadas.
import re, pathlib, sys
root = pathlib.Path(sys.argv[1])
files = [p for d in ["src/app/(app)", "src/components", "src/app/actions", "src/lib"] for ext in ("*.tsx", "*.ts") for p in (root / d).rglob(ext)]
text = "\n".join(p.read_text() for p in files)
tok = set(re.findall(r'(?<![\w:-])((?:hover:|focus:|group-hover:|open:|group-open:|focus-within:|disabled:)?(?:bg|text|border|ring|divide|from|to|via)-(?:[a-z]+)(?:-\d{2,3})?(?:/\d+)?)(?![\w-])', text))
H = {"emerald":("#10b981","#6ee7b7","#34d399"),"green":("#22c55e","#86efac","#4ade80"),"orange":("#f97316","#fdba74","#fb923c"),"brand":("#f97316","#ffa36b","#ff8a3d"),
"rose":("#f43f5e","#fda4af","#fb7185"),"red":("#ef4444","#fca5a5","#f87171"),"amber":("#f59e0b","#fcd34d","#fbbf24"),"yellow":("#eab308","#fde047","#facc15"),
"sky":("#0ea5e9","#7dd3fc","#38bdf8"),"blue":("#3b82f6","#93c5fd","#60a5fa"),"violet":("#8b5cf6","#c4b5fd","#a78bfa"),"purple":("#a855f7","#d8b4fe","#c084fc"),
"indigo":("#6366f1","#a5b4fc","#818cf8"),"teal":("#14b8a6","#5eead4","#2dd4bf"),"cyan":("#06b6d4","#67e8f9","#22d3ee"),"fuchsia":("#d946ef","#f0abfc","#e879f9"),
"pink":("#ec4899","#f9a8d4","#f472b6"),"lime":("#84cc16","#bef264","#a3e635")}
def rgba(h, a):
    h=h.lstrip('#'); r,g,b=int(h[0:2],16),int(h[2:4],16),int(h[4:6],16); return f"rgba({r},{g},{b},{a:.3f})"
ZT={"900":"#ffffff","800":"#ececef","700":"#d4d6db","600":"#b9bcc4","500":"#9ea3ad"}
ZB={"50":"#111318","100":"#1c1f25","200":"#262a31","300":"#353a42"}
ZL={"100":0.06,"200":0.09,"300":0.14}
def value(kind, color, shade, op):
    o = (int(op)/100) if op else 1.0
    if color == "white" and shade is None:
        if kind == "bg":
            if op and int(op) < 40: return None
            return "#15171c" if not op else rgba("#15171c", o)
        if kind in ("from","to","via"): return "#15171c"
        return None
    if color == "zinc":
        if kind == "text" and shade in ZT and not op: return ZT[shade]
        if kind in ("bg","from","to","via") and shade in ZB: return ZB[shade] if not op else rgba(ZB[shade], o)
        if kind in ("border","ring","divide") and shade in ZL: return f"rgba(255,255,255,{ZL[shade]*o:.3f})"
        return None
    if color in H:
        c5,c3,c4 = H[color]
        if kind in ("bg","from","to","via") and shade in ("50","100","200"): return rgba(c5, {"50":.10,"100":.16,"200":.24}[shade]*o)
        if kind == "text" and not op:
            if shade == "600": return c4
            if shade in ("700","800","900"): return c3
        if kind in ("border","ring") and shade in ("100","200","300"): return rgba(c5, {"100":.2,"200":.3,"300":.45}[shade]*o)
    return None
def esc(s): return re.sub(r'([:/.\[\]])', r'\\\1', s)
out=[]
for t in sorted(tok):
    m = re.match(r'(?:(hover|focus|group-hover|open|group-open|focus-within|disabled):)?(bg|text|border|ring|divide|from|to|via)-([a-z]+)(?:-(\d{2,3}))?(?:/(\d+))?$', t)
    if not m: continue
    var, kind, color, shade, op = m.groups()
    v = value(kind, color, shade, op)
    if v is None: continue
    cls = "." + esc(t)
    if var == "hover": sel = f"{cls}:hover"
    elif var == "focus": sel = f"{cls}:focus"
    elif var == "group-hover": sel = f".group:hover {cls}"
    elif var == "open": sel = f"{cls}[open]"
    elif var == "group-open": sel = f".group[open] {cls}"
    elif var == "focus-within": sel = f"{cls}:focus-within"
    elif var == "disabled": sel = f"{cls}:disabled"
    else: sel = cls
    if kind == "divide": sel += " > :not(:last-child)"
    prop = {"bg":"background-color","text":"color","border":"border-color","ring":"--tw-ring-color","divide":"border-color","from":"--tw-gradient-from","to":"--tw-gradient-to","via":"--tw-gradient-via"}[kind]
    out.append(f"html.dk {sel}:not(.dk-off *) {{ {prop}: {v}; }}")
# Fundos claros com cor fixa (chat, editor de fluxos, prévia do WhatsApp)
HEX = {"#efeae2": "#0b141a", "#efe7dd": "#0b141a", "#e7ddd3": "#111b21", "#faf6f2": "#0c0e11", "#f6f6f9": "#0d0f12", "#f4f4f7": "#0f1114"}
for h, v in HEX.items():
    if f"bg-[{h}]" in text:
        out.append(f"html.dk .bg-\\[\\{h}\\]:not(.dk-off *) {{ background-color: {v}; }}")
head = """/* Visual da plataforma: toques de tecnologia no claro e tema escuro (html.dk, ligado no menu). GERADO por scripts/gen-app-dark.py a partir das classes usadas:
   rode de novo quando aparecer cor clara nova. O menu lateral (.dk-off) já é escuro e fica de fora. */
html.dk, html.dk body { background: #090a0d; color: #e8e9ec; color-scheme: dark; }
html.dk .skeleton { background: #1c1f25; }
html.dk .skeleton::after { background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.06), transparent); }
html.dk * { scrollbar-color: #2a2d35 transparent; }
html.dk ::-webkit-scrollbar-thumb { background: #2a2d35; background-clip: padding-box; }
html.dk :where(input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]), select, textarea):not(.dk-off *) { background-color: #111318; color: #f4f4f5; border-color: rgba(255,255,255,0.1); }
html.dk :where(input, textarea)::placeholder { color: #6b7079; }
html.dk option { background: #15171c; color: #f4f4f5; }
html.dk .shadow-soft:not(.dk-off *), html.dk .shadow-sm:not(.dk-off *) { box-shadow: 0 1px 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -12px rgb(0 0 0 / 0.7); }
/* Pegada tecnológica (claro e escuro): grade discreta no fundo, títulos em Inter Tight e botões com luz */
.app-grid { display: block !important; background-image: linear-gradient(rgb(15 23 42 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(15 23 42 / 0.045) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(ellipse 80% 60% at 70% 0%, #000 20%, transparent 75%); }
main :where(h1, h2, h3) { font-family: "Inter Tight", Inter, sans-serif; letter-spacing: -0.025em; }
.bg-brand-gradient:not(.dk-off *) { box-shadow: 0 0 0 1px rgb(255 255 255 / 0.12) inset, 0 8px 22px -10px rgb(255 90 20 / 0.55); }
@font-face { font-family: "Inter Tight"; src: url("/fonts/inter-tight.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
html.dk .app-bg > div:first-child { background: radial-gradient(700px circle at 85% -5%, rgba(255,106,0,.16), transparent 65%), radial-gradient(600px circle at 20% 110%, rgba(255,48,61,.08), transparent 65%) !important; }
html.dk .app-grid { background-image: linear-gradient(rgb(255 255 255 / 0.03) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.03) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(ellipse 80% 60% at 70% 0%, #000 20%, transparent 75%); }
html.dk .app-bg svg { opacity: 0.025; }
html.dk .bg-brand-gradient:not(.dk-off *) { box-shadow: 0 0 0 1px rgb(255 255 255 / 0.08) inset, 0 10px 28px -12px rgb(255 90 20 / 0.6); }
html.dk :where(.rounded-2xl, .rounded-3xl, .rounded-xl).bg-white:not(.dk-off *) { background-image: linear-gradient(180deg, rgb(255 255 255 / 0.025), transparent 40%); }
html.dk ::selection { background: rgb(255 106 0 / 0.35); }
html.dk .shadow-lift:not(.dk-off *) { box-shadow: 0 1px 0 rgb(255 255 255 / 0.05) inset, 0 16px 40px -16px rgb(0 0 0 / 0.85); }
"""
(root / "src/app/app-dark.css").write_text(head + "\n".join(out) + "\n")
print(len(out), "regras")
