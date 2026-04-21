import { db } from "@/lib/db";
import { buttonVariants } from "@/lib/button-variants";
import Link from "next/link";
import { Building2, Plus, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AresCheckButton } from "@/components/clients/ares-check-button";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await db.client.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Správa</p>
          <h1 className="text-3xl font-bold tracking-tight">Odběratelé</h1>
        </div>
        <div className="flex items-center gap-2">
          {clients.length > 0 && <AresCheckButton />}
          <Link href="/clients/new" className={cn(buttonVariants(), "rounded-full gap-1.5")}>
            <Plus className="h-4 w-4" />
            Přidat odběratele
          </Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-violet-600" />
          </div>
          <p className="text-foreground font-semibold mb-1">Žádní odběratelé</p>
          <p className="text-muted-foreground text-sm mb-5">Přidej svého prvního klienta</p>
          <Link href="/clients/new" className={cn(buttonVariants(), "rounded-full")}>
            Přidat odběratele
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/50">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{client.name}</p>
                    {client.aresHasChanges && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                        <AlertCircle className="h-2.5 w-2.5" />
                        ARES změny
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    IČO: {client.ico}
                    {client.dic ? ` · DIČ: ${client.dic}` : ""}
                    {` · ${client.hourlyRate} Kč/hod`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <p className="text-xs">{client.street}, {client.city}</p>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
