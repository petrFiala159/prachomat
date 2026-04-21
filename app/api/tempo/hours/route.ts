import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { fetchTempoWorklogs, checkTimesheetApproval } from "@/lib/tempo";

// GET /api/tempo/hours?accountId=X&month=2026-04 [&projectKey=ABC]
// Pokud chybí accountId, použije se legacy supplier.tempoApiToken (zpětná kompatibilita).
export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month");
  const projectKeyOverride = req.nextUrl.searchParams.get("projectKey");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: "Parametr month musí být YYYY-MM" }, { status: 400 });
  }

  let baseUrl: string | null = null;
  let apiToken: string | null = null;
  let accountProjectKey: string | null = null;

  if (accountId) {
    const account = await db.tempoAccount.findUnique({ where: { id: accountId } });
    if (!account) return NextResponse.json({ error: "Tempo účet nenalezen" }, { status: 404 });
    baseUrl = account.baseUrl;
    apiToken = account.apiToken;
    accountProjectKey = account.projectKey;
  } else {
    const supplier = await db.supplier.findFirst({
      select: { tempoApiToken: true, tempoBaseUrl: true },
    });
    if (!supplier?.tempoApiToken) {
      return NextResponse.json(
        { error: "Tempo token není nastavený. Přidej Tempo účet v Nastavení." },
        { status: 400 }
      );
    }
    baseUrl = supplier.tempoBaseUrl || "https://api.tempo.io/4";
    apiToken = supplier.tempoApiToken;
  }

  const [y, m] = monthParam.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    const summary = await fetchTempoWorklogs({
      baseUrl: baseUrl!,
      token: apiToken!,
      from,
      to,
    });

    const filterKey = projectKeyOverride || accountProjectKey;
    if (filterKey) {
      const proj = summary.projects[filterKey] ?? { hours: 0, count: 0 };
      return NextResponse.json({
        month: monthParam,
        projectKey: filterKey,
        totalHours: proj.hours,
        billableHours: proj.hours,
        count: proj.count,
        projects: { [filterKey]: proj },
      });
    }

    // Kontrola schválení výkazu
    const approval = await checkTimesheetApproval(baseUrl!, apiToken!, from, to);

    return NextResponse.json({
      month: monthParam,
      ...summary,
      timesheetApproved: approval.approved,
      timesheetStatus: approval.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Chyba Tempa: ${msg}` }, { status: 502 });
  }
}
