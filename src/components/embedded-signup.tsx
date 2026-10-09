"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Zap } from "lucide-react";
import { Button, Card } from "./ui";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

type SessionInfo = { waba_id?: string; phone_number_id?: string };

export function EmbeddedSignup({ appId, configId, graphVersion }: { appId: string; configId: string; graphVersion: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<null | "CLOUD_API" | "COEXISTENCE">(null);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const session = useRef<SessionInfo>({});
  const enabled = Boolean(appId && configId);

  useEffect(() => {
    if (!enabled) return;
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      setReady(true);
    };
    if (!document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      document.body.appendChild(s);
    } else if (window.FB) setReady(true);

    const onMessage = (event: MessageEvent) => {
      if (!String(event.origin).endsWith("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          if (String(data.event).startsWith("FINISH")) session.current = data.data ?? {};
          if (data.event === "CANCEL") setMsg({ error: `Cadastro cancelado${data.data?.current_step ? ` na etapa ${data.data.current_step}` : ""}` });
          if (data.event === "ERROR") setMsg({ error: data.data?.error_message ?? "Erro no cadastro da Meta" });
        }
      } catch {
        /* mensagens que não são do signup */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [appId, configId, graphVersion, enabled]);

  function launch(type: "CLOUD_API" | "COEXISTENCE") {
    if (!window.FB) return;
    setMsg({});
    session.current = {};
    setBusy(type);
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setBusy(null);
          setMsg({ error: "Login com a Meta não foi concluído" });
          return;
        }
        // O evento com waba_id pode chegar logo depois do callback: espera até 6s por ele
        void (async () => {
          for (let i = 0; i < 12 && !session.current.waba_id; i++) await new Promise((r) => setTimeout(r, 500));
          const res = await fetch("/api/meta/embedded-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, wabaId: session.current.waba_id, phoneNumberId: session.current.phone_number_id, type }),
          });
          const json = await res.json();
          setBusy(null);
          if (!res.ok) setMsg({ error: json.error ?? "Falha ao conectar" });
          else {
            setMsg({ ok: "Conectado! Números e templates sincronizados." });
            router.refresh();
          }
        })();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
          version: "v4",
          ...(type === "COEXISTENCE" ? { featureType: "whatsapp_business_app_onboarding" } : {}),
        },
      },
    );
  }

  const cards = [
    { type: "CLOUD_API" as const, title: "Cloud API", text: "Números novos ou dedicados à API oficial da Meta.", cta: "Conectar Cloud API", icon: Zap },
    { type: "COEXISTENCE" as const, title: "Coexistência", text: "Números ativos no WhatsApp Business App.", cta: "Conectar em Coexistência", icon: Smartphone },
  ];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.type} className="p-6">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><c.icon className="size-5" /></div>
            <div className="font-semibold">{c.title}</div>
            <p className="mt-1 mb-4 text-zinc-500">{c.text}</p>
            <Button onClick={() => launch(c.type)} disabled={!enabled || !ready || busy !== null}>
              {busy === c.type ? "Conectando..." : c.cta}
            </Button>
          </Card>
        ))}
      </div>
      {!enabled && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          Conexão automática ainda não está liberada na plataforma. Enquanto isso, use a configuração manual abaixo.
        </p>
      )}
      {msg.error && <p className="mt-3 text-red-600">{msg.error}</p>}
      {msg.ok && <p className="mt-3 text-emerald-700">{msg.ok}</p>}
    </div>
  );
}
