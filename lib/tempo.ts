// Tempo API (Jira time tracking) — https://apidocs.tempo.io/
//
// Autentizace: Bearer token (Personal Access Token vytvořený v Tempo UI).
// Base URL obvykle https://api.tempo.io/4 (Cloud) nebo self-hosted instance.

type TempoWorklog = {
  tempoWorklogId: number;
  issue: { id: number; key?: string; self?: string };
  timeSpentSeconds: number;
  billableSeconds: number;
  startDate: string; // YYYY-MM-DD
  description?: string;
  author?: { accountId: string; displayName?: string };
};

type TempoResponse = {
  results: TempoWorklog[];
  metadata?: { count: number; offset: number; limit: number };
};

export type TempoFetchOptions = {
  baseUrl: string;
  token: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  accountKey?: string; // filtr podle Jira project/account
};

export type TempoSummary = {
  totalSeconds: number;
  totalHours: number;
  billableHours: number;
  count: number;
  projects: Record<string, { hours: number; count: number }>;
};

export async function checkTimesheetApproval(
  baseUrl: string,
  token: string,
  from: string,
  to: string
): Promise<{ approved: boolean; status: string }> {
  const base = baseUrl.replace(/\/+$/, "");
  try {
    const url = `${base}/timesheet-approvals?from=${from}&to=${to}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { approved: false, status: "unknown" };
    const data = await res.json();
    const results = data.results ?? [];
    if (results.length === 0) return { approved: false, status: "no_data" };
    const allApproved = results.every((r: { status?: { key?: string } }) => r.status?.key === "APPROVED");
    return { approved: allApproved, status: allApproved ? "approved" : "pending" };
  } catch {
    return { approved: false, status: "error" };
  }
}

export async function fetchTempoWorklogs(opts: TempoFetchOptions): Promise<TempoSummary> {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const url = `${base}/worklogs?from=${opts.from}&to=${opts.to}&limit=1000`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Tempo API ${res.status}: ${await res.text()}`);
  }

  const data: TempoResponse = await res.json();
  const worklogs = data.results ?? [];

  const projects: Record<string, { hours: number; count: number }> = {};
  let totalSeconds = 0;
  let billableSeconds = 0;

  for (const wl of worklogs) {
    totalSeconds += wl.timeSpentSeconds;
    billableSeconds += wl.billableSeconds;

    const key = wl.issue.key?.split("-")[0] ?? `issue-${wl.issue.id}`;
    const existing = projects[key] ?? { hours: 0, count: 0 };
    existing.hours += wl.timeSpentSeconds / 3600;
    existing.count += 1;
    projects[key] = existing;
  }

  return {
    totalSeconds,
    totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
    billableHours: Math.round((billableSeconds / 3600) * 100) / 100,
    count: worklogs.length,
    projects,
  };
}
