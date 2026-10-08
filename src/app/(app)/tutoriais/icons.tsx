import { MessagesSquare, Bell, BookOpen, Building2, ChartLine, Coins, FileText, HelpCircle, Layers, Megaphone, Rocket, Settings, ShieldCheck, Sparkles } from "lucide-react";
import type { Tutorial } from "@/lib/tutorials";

export const TUTORIAL_ICONS: Record<Tutorial["icon"], typeof BookOpen> = {
  rocket: Rocket,
  building: Building2,
  layers: Layers,
  file: FileText,
  sparkles: Sparkles,
  megaphone: Megaphone,
  chart: ChartLine,
  chat: MessagesSquare,
  bell: Bell,
  coins: Coins,
  settings: Settings,
  shield: ShieldCheck,
  help: HelpCircle,
};
