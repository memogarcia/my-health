import { cn } from "@/lib/utils";

export type IconName =
  | "activity" | "body" | "chat" | "chevron" | "developer" | "diet" | "document" | "heart"
  | "eye" | "labs" | "lock" | "medication" | "plus" | "search" | "settings"
  | "sparkles" | "symptom" | "timer" | "wind";

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <><path d="M4 12h3l2-6 4 12 2-6h5" /></>,
    body: <><circle cx="12" cy="5" r="2.5" /><path d="M8.5 21v-5l-2-4.5A3 3 0 0 1 9.2 7h5.6a3 3 0 0 1 2.7 4.5l-2 4.5v5M9 12h6" /></>,
    chat: <path d="M20 15a4 4 0 0 1-4 4H8l-4 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    developer: <><path d="M8 8h8v8H8zM10 4v4M14 4v4M10 16v4M14 16v4M4 10h4M4 14h4M16 10h4M16 14h4" /><path d="M10.5 11.5h3M10.5 14h2" /></>,
    diet: <><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10" /><path d="M17 3v18M17 3c3 2 3 7 0 9" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" />,
    labs: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    medication: <><path d="m10 4 10 10a4 4 0 0 1-6 6L4 10a4 4 0 0 1 6-6Z" /><path d="m8 14 6-6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V21h-4v-.1A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 2.7 13H2V9h.7a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1L6.7 3l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 1.8V1h4v.8a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1L20 5.8l-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21.2 9h.8v4h-.8a1.8 1.8 0 0 0-1.8 2Z" /></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" /><path d="m6 14 .8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8Z" /><path d="m18 14 .7 1.8 1.8.7-1.8.7L18 19l-.7-1.8-1.8-.7 1.8-.7Z" /></>,
    symptom: <><path d="M4 6h16M4 12h10M4 18h7" /><circle cx="18" cy="17" r="2" /></>,
    timer: <><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></>,
    wind: <><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>,
  };
  return <svg aria-hidden="true" className={cn("block shrink-0 stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]", className)} fill="none" height={size} viewBox="0 0 24 24" width={size}>{paths[name]}</svg>;
}
