import { db } from "@/lib/db";
import Link from "next/link";
import { FileText, Users, Receipt as ReceiptIcon, Zap, Settings as SettingsIcon, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const entityIcons: Record<string, React.ElementType> = {
  invoice: FileText,
  client: Users,
  receipt: ReceiptIcon,
  template: Zap,
  supplier: SettingsIcon,
};

const entityLinks: Record<string, (id: string) => string | null> = {
  invoice: (id) => id === "bulk" ? "/invoices" : `/invoices/${id}`,
  client: (id) => `/clients/${id}`,
  template: () => "/templates",
  receipt: () => "/receipts",
};

const actionLabels: Record<string, string> = {
  created: "vytvořeno",
  updated: "upraveno",
  deleted: "smazáno",
  bulk_created: "hromadně vytvořeno",
  sent: "odesláno",
  paid: "zaplaceno",
};

function fmtRelative(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `před ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `před ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `před ${d} dny`;
  return new Date(date).toLocaleDateString("cs-CZ");
}

export default async function ActivityPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Audit</p>
        <h1 className="text-3xl font-bold tracking-tight">Historie změn</h1>
        <p className="text-xs text-muted-foreground mt-1">Posledních 100 událostí. Nejnovější nahoře.</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-16 text-center">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Zatím žádná aktivita.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
          {logs.map((log) => {
            const Icon = entityIcons[log.entityType] ?? Clock;
            const linkBuilder = entityLinks[log.entityType];
            const href = linkBuilder ? linkBuilder(log.entityId) : null;
            const label = actionLabels[log.action] ?? log.action;

            const content = (
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">{log.entityType}</span>{" "}
                    <span className="font-semibold">{label}</span>
                    {log.summary && <> — {log.summary}</>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{fmtRelative(log.createdAt)}</p>
                </div>
              </div>
            );

            if (href) {
              return (
                <Link key={log.id} href={href} className="block hover:bg-muted/40 transition-colors">
                  {content}
                </Link>
              );
            }
            return <div key={log.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
