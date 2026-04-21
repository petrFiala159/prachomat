"use client";

import { useState } from "react";
import { BookOpen, Code2, Sparkles, FileText, Users, Zap, Receipt, BarChart2, Settings, RefreshCw, Share2, Globe, FileCode, Bell, Layers, Send, FolderArchive, ShieldCheck, Clock, Search, Key, Calendar, TrendingUp, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "user" | "tech";

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>("user");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Nápověda</p>
        <h1 className="text-3xl font-bold tracking-tight">Dokumentace</h1>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/50">
        <button
          onClick={() => setTab("user")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "user" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Uživatelská
        </button>
        <button
          onClick={() => setTab("tech")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "tech" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Code2 className="h-3.5 w-3.5" />
          Technická
        </button>
      </div>

      {tab === "user" ? <UserDocs /> : <TechDocs />}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-foreground/80 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>;
}

function UserDocs() {
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <p className="text-sm font-medium text-primary mb-1">Vítej v Prachomatu</p>
        <p className="text-sm text-foreground/80">
          Prachomat je jednoduchá aplikace pro správu faktur pro freelancery a malé firmy. Níže je přehled všeho, co aplikace umí, a jak funkce používat.
        </p>
      </div>

      <Section icon={Sparkles} title="AI tvorba faktury (Claude Haiku)">
        <p>
          Na <strong>Přehledu</strong> najdeš panel &quot;Vytvořit fakturu pomocí AI&quot;. Napiš nebo nadiktuj co chceš fakturovat — <strong>Claude Haiku 4.5</strong> z textu extrahuje klienta, hodiny, sazbu a vytvoří fakturu jako koncept. Pokud zmíníš víc činností, AI vytvoří <strong>víc položek</strong>.
        </p>
        <p className="text-muted-foreground">Příklady:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Faktura pro MALFINI, 40 hodin vývoje</li>
          <li>Pro Alza 15h backend, 5h code review, 3h deployment, sazba 2000</li>
          <li>Konzultace pro Skoda Auto, 8 hodin, splatnost 30 dní</li>
        </ul>
        <p>
          Mikrofon (Chrome, Safari) — klikni na ikonu a nadiktuj. Pokud chybí Anthropic API kredit, systém přepne na regex parser (méně přesný, ale funkční offline).
        </p>
      </Section>

      <Section icon={FileText} title="Faktury">
        <p>
          Všechny faktury najdeš v sekci <strong>Faktury</strong>. Každou můžeš:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Stáhnout jako <strong>PDF</strong> (včetně QR kódu pro okamžitou platbu)</li>
          <li>Exportovat jako <strong>ISDOC</strong> (XML formát pro účetní software)</li>
          <li>Odeslat klientovi <strong>e-mailem</strong> (přes tlačítko Odeslat)</li>
          <li>Označit jako zaplacenou, upravit, duplikovat nebo smazat</li>
          <li>Vytvořit <strong>sdílitelný odkaz</strong> pro klienta (klient uvidí fakturu bez přihlášení)</li>
        </ul>
        <p>
          Ve filtrech nad seznamem můžeš filtrovat podle stavu, klienta nebo roku. Více faktur najednou vybereš kliknutím na checkbox — poté můžeš hromadně odeslat, změnit stav nebo smazat.
        </p>
        <p><strong>Typy faktur:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Běžná</strong> — standardní daňový doklad</li>
          <li><strong>Zálohová</strong> — po zaplacení klikni &quot;Vyúčtovat&quot; pro automatický dobropis zálohy</li>
          <li><strong>Proforma</strong> — výzva k platbě (ne-daňový doklad). PDF říká &quot;Tento doklad není daňovým dokladem.&quot;</li>
          <li><strong>Dobropis</strong> — opravný doklad se zápornými částkami (tlačítko na detailu faktury)</li>
        </ul>
        <p><strong>Pokročilé:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Více položek</strong> — přidej libovolný počet řádků (popis, množství, jednotka, cena, sazba DPH). Drag &amp; drop pro přesouvání.</li>
          <li><strong>Multi-měna</strong> — CZK, EUR, USD, GBP. Kurz ČNB se automaticky dotáhne k datu vystavení a zobrazí ekvivalent v Kč na PDF.</li>
          <li><strong>Reverse charge (EU)</strong> — toggle pro přenesení daňové povinnosti. Faktura je bez DPH s příslušným textem.</li>
          <li><strong>Dvojjazyčné PDF</strong> — přepínač Česky / English. Všechny popisky na PDF se přeloží.</li>
          <li><strong>Zaokrouhlení na celé Kč</strong> — checkbox ve formuláři. Zaokrouhlení se zobrazí jako samostatný řádek.</li>
          <li><strong>Tagy</strong> — libovolné štítky oddělené čárkou pro filtrování a organizaci.</li>
        </ul>
      </Section>

      <Section icon={Zap} title="Šablony a pravidelné faktury">
        <p>
          V sekci <strong>Šablony</strong> si ulož opakující se fakturace (například měsíční paušál pro klienta). Stačí jeden klik &quot;Vytvořit fakturu&quot; a šablona se změní na nový koncept.
        </p>
        <p>
          Zapnutím přepínače <strong>&quot;Opakovaná fakturace&quot;</strong> na šabloně aplikace <strong>automaticky</strong> vytvoří faktury v zadaném intervalu (týden / 2 týdny / měsíc / 3 měsíce). Stačí navštívit Přehled a systém při každé návštěvě zkontroluje, které šablony jsou &quot;splatné&quot; a vytvoří z nich koncepty.
        </p>
      </Section>

      <Section icon={Receipt} title="Účtenky (DPH podklady)">
        <p>
          Sekce <strong>Účtenky</strong> slouží plátcům DPH pro archivaci přijatých účtenek a výpočet měsíčního DPH.
        </p>
        <p><strong>Jak dostat scan do aplikace (3 způsoby):</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Tlačítko &quot;Nahrát účtenky&quot;</strong> — otevře dialog pro výběr souborů (1 nebo více)</li>
          <li><strong>Drag &amp; drop</strong> — přetáhni soubory z Finderu / scanner aplikace přímo na stránku Účtenky</li>
          <li><strong>Scanner složka</strong> — nastav v Nastavení cestu, kam Brother iPrint&amp;Scan ukládá scany. Pak klikneš &quot;Importovat ze složky&quot; a všechny nové soubory se automaticky zpracují a přesunou do <code className="bg-muted px-1 rounded text-[10px]">.prachomat-imported</code> archivu.</li>
        </ol>
        <p><strong>Workflow po nahrání:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>AI přečte obsah</strong> — Claude Haiku detekuje <em>i více účtenek na jednom scanu</em>, vytáhne prodejce, IČO, datum, základ, DPH, sazbu a položky</li>
          <li><strong>Zkontroluješ a schválíš</strong> — klikneš na účtenku, vedle scanu vidíš formulář s AI daty, můžeš cokoliv upravit, klikneš <em>Schválit</em></li>
          <li><strong>Odešleš účetní</strong> — na konci měsíce tlačítko &quot;Odeslat účetní&quot; pošle všechny scany + CSV s daty na e-mail účetní</li>
        </ol>
        <p className="text-muted-foreground">
          <strong>Proč nejde scanovat přímo v prohlížeči?</strong> Browsery nemají přístup ke scanner ovladačům (TWAIN/SANE/WIA) kvůli bezpečnosti. Řešení přes scanner složku je stejně rychlé — v Brother iPrint&amp;Scan nastav &quot;Scan to Folder&quot; a tu samou cestu napiš do Prachomat Nastavení.
        </p>
        <p>
          Stránka zobrazuje <strong>měsíční DPH kalkulačku</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>DPH na výstupu</strong> = součet DPH z faktur vystavených v měsíci</li>
          <li><strong>DPH na vstupu</strong> = součet DPH ze schválených účtenek</li>
          <li><strong>DPH k platbě</strong> = výstup − vstup</li>
        </ul>
        <p className="text-muted-foreground">
          <strong>Stavy účtenky:</strong> <em>Čeká na review</em> (nahráno, AI ji přepsala, čeká na tvé schválení) → <em>Schváleno</em> (počítá se do DPH) → <em>Odesláno</em> (po odeslání účetní).
        </p>
      </Section>

      <Section icon={Users} title="Odběratelé">
        <p>
          V sekci <strong>Odběratelé</strong> spravuješ seznam klientů. Při přidávání nového odběratele stačí zadat IČO a aplikace pomocí služby <strong>ARES</strong> automaticky doplní název, adresu i DIČ.
        </p>
        <p>
          Každý klient může mít výchozí hodinovou sazbu — při tvorbě faktury se pak sazba automaticky předvyplní.
        </p>
      </Section>

      <Section icon={BarChart2} title="Výkazy">
        <p>
          Sekce <strong>Výkazy</strong> ukazuje roční souhrny: fakturováno, zaplaceno, náklady, zisk, marže, odpracované hodiny. K dispozici je:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Měsíční rozpad s grafem</li>
          <li>Breakdown podle odběratelů</li>
          <li>Tlačítko <strong>Daňový přehled</strong> — vygeneruje CSV pro účetní se všemi fakturami a výdaji za rok</li>
        </ul>
      </Section>

      <Section icon={RefreshCw} title="Automatické párování plateb (Fio banka)">
        <p>
          Pokud používáš Fio banku, můžeš si v <strong>Nastavení</strong> vložit API token. Poté tlačítko <strong>&quot;Načíst platby&quot;</strong> na Přehledu stáhne transakce z banky a automaticky označí faktury jako zaplacené, pokud sedí variabilní symbol a částka.
        </p>
        <p>
          <strong>Jak získat token:</strong> V internetbankingu Fio přejdi do Nastavení → API → Povolit službu. Token nastav pouze s právy ke čtení.
        </p>
      </Section>

      <Section icon={Bell} title="Notifikace">
        <p>
          Přehled automaticky upozorní na dva typy faktur:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Blížící se splatnost</strong> (žluté upozornění) — faktury splatné v následujících 7 dnech</li>
          <li><strong>Po splatnosti</strong> (červené upozornění) — nezaplacené faktury s prošlou splatností. Tlačítkem &quot;Upomínka všem&quot; je možné hromadně odeslat upomínky všem klientům s e-mailem.</li>
        </ul>
      </Section>

      <Section icon={Share2} title="Klientský portál">
        <p>
          Nechceš klientovi posílat e-mail nebo PDF? Na detailu faktury klikni na ikonu <strong>Sdílet</strong> a získáš veřejný odkaz ve tvaru <Code>/public/invoice/TOKEN</Code>. Klient na něm uvidí fakturu bez přihlášení a může si stáhnout PDF.
        </p>
      </Section>

      <Section icon={FolderArchive} title="Dokumenty (archiv smluv)">
        <p>
          Sekce <strong>Dokumenty</strong> slouží jako digitální archiv smluv, SLA, NDA, certifikátů a dalších souborů. Ke každému dokumentu lze přiřadit:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kategorii (Smlouva, Dohoda, SLA, NDA, Certifikát, Objednávka, Ostatní)</li>
          <li>Klienta (volitelné)</li>
          <li>Platnost od/do — vypršené smlouvy mají červený badge</li>
          <li>Tagy a poznámku</li>
        </ul>
        <p>Soubory se ukládají na disk do <Code>storage/documents/</Code>.</p>
      </Section>

      <Section icon={ShieldCheck} title="Ověření klienta (VIES + plátce DPH)">
        <p>
          Na detailu klienta je panel <strong>Ověření DIČ</strong> s tlačítkem &quot;Ověřit&quot;:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>VIES</strong> — ověření platnosti EU DIČ přes oficiální REST API Evropské komise. Důležité před vystavením reverse charge faktury.</li>
          <li><strong>Plátce DPH CZ</strong> — kontrola přes ARES, zda má klient registrované DIČ (aktivní/neplátce).</li>
          <li><strong>ARES hlídač změn</strong> — tlačítko &quot;Zkontrolovat ARES&quot; na stránce klientů porovná všechny klienty s ARES a označí ty, u kterých se změnila adresa, název nebo DIČ.</li>
        </ul>
      </Section>

      <Section icon={Clock} title="Tempo integrace (import hodin z Jiry)">
        <p>
          Pro import odpracovaných hodin z <strong>Tempo</strong> (Jira time tracking):
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>V Nastavení → Tempo přidej 1 nebo více účtů (každý pro jinou Jiru / firmu) s Personal Access Tokenem</li>
          <li>Volitelně nastav výchozího klienta a project key filter</li>
          <li>Na nové faktuře klikni &quot;Import z Tempa&quot; → vyber účet → měsíc → Načíst</li>
          <li>Systém stáhne hodiny a zobrazí součty po projektech. Klikni &quot;Použít&quot; pro import do položek.</li>
        </ol>
        <p>Pokud má výkaz v Tempu status &quot;schválený&quot;, API to detekuje a zobrazí.</p>
      </Section>

      <Section icon={Search} title="Globální vyhledávání (Cmd+K)">
        <p>
          Stiskni <strong>Cmd+K</strong> (nebo Ctrl+K) kdekoli v aplikaci — otevře se vyhledávací dialog. Hledá across:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Čísla faktur, poznámky, jména klientů</li>
          <li>IČO, e-maily, města klientů</li>
          <li>Prodejce a částky účtenek</li>
        </ul>
        <p>Výsledky jsou klikatelné — vedou na detail.</p>
      </Section>

      <Section icon={TrendingUp} title="Cash flow prognóza">
        <p>
          Widget na dashboardu zobrazuje očekávané příjmy do <strong>30 / 60 / 90 dní</strong> z:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nesplacených faktur (podle dat splatnosti)</li>
          <li>Predikce z recurring šablon (kolik přibude z pravidelných)</li>
        </ul>
        <p>Pokud jsou faktury po splatnosti, červené upozornění.</p>
      </Section>

      <Section icon={BarChart2} title="Výkazy — pokročilé">
        <p>Ve výkazech máš navíc:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Měsíční detail</strong> — klikni na měsíc a uvidíš všechny faktury + účtenky + DPH kalkulaci</li>
          <li><strong>Srovnání rok na rok</strong> — tabulka s % změnami per měsíc oproti předchozímu roku</li>
          <li><strong>Nejhorší platiči</strong> — průměrná doba úhrady per klient (zelená &lt;14d, amber &lt;30d, červená &gt;30d)</li>
          <li><strong>Export</strong> — CSV daňový přehled, Pohoda XML, Kontrolní hlášení DPH (KH1 XML), Přiznání DPH (DP3 XML)</li>
        </ul>
      </Section>

      <Section icon={Calendar} title="iCal feed splatností">
        <p>
          V Nastavení vygeneruj <strong>iCal feed URL</strong> a přidej ho do Google / Apple / Outlook kalendáře. Každá nezaplacená faktura se zobrazí jako celodenní událost na den splatnosti. Po uhrazení zmizí automaticky.
        </p>
      </Section>

      <Section icon={Cpu} title="Automatizace (Cron)">
        <p>
          Endpoint <Code>GET /api/cron?secret=XXX</Code> lze volat externím cronem a provede:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Generování faktur z recurring šablon</li>
          <li>Označení SENT faktur jako OVERDUE</li>
          <li>Automatické odesílání upomínek (pokud je v Nastavení zapnutý &quot;auto-remind&quot;)</li>
        </ul>
        <p className="text-muted-foreground">
          Doporučujeme spouštět 1× denně v 6:00 přes <a href="https://cron-job.org" className="underline">cron-job.org</a> nebo GitHub Actions.
        </p>
      </Section>

      <Section icon={Key} title="Přihlašování a bezpečnost">
        <p>
          Nastav <Code>AUTH_PASSWORD</Code> v <Code>.env</Code> pro zapnutí přihlašování heslem. Login stránka, session cookie, logout tlačítko v sidebaru.
        </p>
        <p>
          Pro mobilní / externí integraci vygeneruj <strong>API token</strong> v Nastavení — pak volej API s hlavičkou <Code>Authorization: Bearer &lt;token&gt;</Code>.
        </p>
      </Section>

      <Section icon={Settings} title="Nastavení">
        <p>
          V <strong>Nastavení</strong> konfiguruj:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fakturační údaje, banka, DPH, logo (s ořezem)</li>
          <li><strong>Číslování faktur</strong> — prefix, počet číslic, rok</li>
          <li><strong>Vzhled PDF</strong> — barva akcentu, obchodní podmínky, patička</li>
          <li><strong>Šablony e-mailů</strong> — pro fakturu i upomínku s <Code>{`{{placeholders}}`}</Code></li>
          <li><strong>Účetní</strong> — jméno + e-mail pro odeslání účtenek</li>
          <li><strong>Scanner složka</strong> — cesta pro import z Brother iPrint&amp;Scan</li>
          <li><strong>Tempo účty</strong> — 1 nebo více Jira/Tempo napojení</li>
          <li><strong>Fio API</strong> — token pro párování plateb</li>
          <li><strong>API token</strong> — pro mobilní app</li>
          <li><strong>iCal feed</strong> — URL pro kalendář splatností</li>
          <li><strong>Záloha a obnova</strong> — kompletní JSON export/import</li>
        </ul>
      </Section>
    </div>
  );
}

function TechDocs() {
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 border border-border/50 rounded-2xl p-5">
        <p className="text-sm font-medium mb-1">Technický přehled</p>
        <p className="text-sm text-muted-foreground">
          Prachomat je Next.js 16 aplikace se serverovým renderingem, Prisma ORM nad SQLite a komponenty postavenými nad Tailwind CSS v4. Tato sekce popisuje architekturu a klíčové moduly.
        </p>
      </div>

      <Section icon={Layers} title="Stack">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Next.js 16.2</strong> (App Router, Turbopack)</li>
          <li><strong>React 19</strong> se server components</li>
          <li><strong>Prisma 7</strong> s <Code>@prisma/adapter-better-sqlite3</Code></li>
          <li><strong>SQLite</strong> — lokální DB v <Code>prisma/dev.db</Code></li>
          <li><strong>Tailwind CSS v4</strong> + <strong>base-ui</strong> (DropdownMenu, Dialog)</li>
          <li><strong>@react-pdf/renderer</strong> — generování PDF</li>
          <li><strong>Resend</strong> — odesílání e-mailů</li>
          <li><strong>qrcode</strong> — SPAYD QR kód pro platby</li>
          <li><strong>react-image-crop</strong> — nástroj pro ořez loga</li>
          <li><strong>recharts</strong> — graf příjmů</li>
          <li><strong>@anthropic-ai/sdk</strong> — nainstalováno pro budoucí Claude API integraci (aktuálně se pro AI používá regex parser)</li>
        </ul>
      </Section>

      <Section icon={FileCode} title="Struktura projektu">
        <pre className="bg-muted/50 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`app/
├── api/              # API routes (POST/GET/DELETE)
│   ├── ai/invoice/   # parser pro AI faktury
│   ├── ares/         # ARES lookup proxy
│   ├── clients/      # CRUD odběratelé
│   ├── expenses/     # CRUD náklady
│   ├── fio/sync/     # sync plateb z Fio banky
│   ├── invoices/     # CRUD + bulk + isdoc + pdf + send + remind
│   ├── reports/      # daňový přehled CSV
│   ├── supplier/     # dodavatel (single row)
│   └── templates/    # CRUD šablony + recurring
├── clients/          # stránka odběratelů
├── docs/             # tato stránka
├── expenses/         # stránka nákladů
├── invoices/         # stránka faktur + detail + new + edit
├── public/invoice/   # veřejný klientský portál
├── reports/          # stránka výkazů
├── settings/         # stránka nastavení
├── templates/        # stránka šablon
└── page.tsx          # Přehled (dashboard)

components/
├── dashboard/        # AI bar, Fio sync, remind-all
├── form/             # AresSearch, LogoCropDialog, DueDateSelector
├── invoices/         # invoice-list, invoice-filters
├── layout/           # Sidebar, ThemeProvider
└── ui/               # base UI (Button, Input, Card...)

lib/
├── db.ts             # Prisma client singleton
├── invoice-number.ts # generátor čísel faktur
├── pdf/              # InvoicePDF + SPAYD helpers
└── utils.ts          # cn() helper

prisma/
└── schema.prisma     # DB schéma`}
        </pre>
      </Section>

      <Section icon={Layers} title="Datový model">
        <p>Hlavní entity v <Code>prisma/schema.prisma</Code>:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Supplier</strong> (1 řádek) — fakturační údaje, banka, DPH, logo, Fio token, nastavení číslování faktur (<Code>invoicePrefix</Code>, <Code>invoiceDigits</Code>, <Code>invoiceUseYear</Code>)
          </li>
          <li>
            <strong>Client</strong> — odběratelé, mají výchozí hodinovou sazbu
          </li>
          <li>
            <strong>Invoice</strong> — faktury s polemi <Code>status</Code> (DRAFT / SENT / PAID / OVERDUE), <Code>invoiceType</Code> (regular / deposit / settlement), <Code>currency</Code>, <Code>publicToken</Code> pro sdílení
          </li>
          <li>
            <strong>InvoiceTemplate</strong> — šablony s podporou recurring (<Code>nextRunAt</Code>, <Code>intervalDays</Code>)
          </li>
          <li>
            <strong>Expense</strong> — náklady, stejná recurring logika
          </li>
        </ul>
      </Section>

      <Section icon={RefreshCw} title="Auto-generování opakovaných záznamů">
        <p>
          Funkce <Code>generateRecurringInvoices()</Code> a <Code>generateRecurringExpenses()</Code> v <Code>app/page.tsx</Code> se spouštějí při každém renderu Přehledu (server component). Načtou šablony / výdaje s <Code>nextRunAt &lt;= now</Code>, vytvoří nové záznamy a posunou <Code>nextRunAt</Code> o <Code>intervalDays</Code> dopředu.
        </p>
        <p>
          Alternativou je samostatný endpoint <Code>POST /api/templates/generate-recurring</Code>, který lze volat z externího cronu (například přes Vercel Cron nebo externí scheduler).
        </p>
      </Section>

      <Section icon={FileText} title="Generování PDF">
        <p>
          PDF faktury se generuje přes <Code>@react-pdf/renderer</Code>. Endpoint <Code>GET /api/invoices/[id]/pdf</Code>:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Načte fakturu včetně dodavatele a odběratele</li>
          <li>Registruje Inter fonty z <Code>public/fonts/</Code> jako base64 data URLs (nutné pro PDF rendering)</li>
          <li>Vygeneruje SPAYD payment string a QR kód přes <Code>qrcode</Code></li>
          <li>Předá vše do komponenty <Code>InvoicePDF</Code> v <Code>lib/pdf/invoice-pdf.tsx</Code></li>
          <li>Vrátí PDF jako stream</li>
        </ol>
        <p>
          PDF design je monochromatický, s horním pruhem, logem, tabulkou položek a patičkou s platebními údaji + QR kódem.
        </p>
      </Section>

      <Section icon={FileCode} title="ISDOC export">
        <p>
          Endpoint <Code>GET /api/invoices/[id]/isdoc</Code> generuje ISDOC 6.0.1 XML, včetně:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dodavatel + odběratel (<Code>AccountingSupplierParty</Code> / <Code>AccountingCustomerParty</Code>)</li>
          <li>Položky faktury (<Code>InvoiceLines</Code>)</li>
          <li>DPH souhrn (<Code>TaxTotal</Code>)</li>
          <li>Platební údaje včetně IBAN (generován z čísla účtu + banky)</li>
        </ul>
      </Section>

      <Section icon={Sparkles} title="AI parser (faktury)">
        <p>
          Endpoint <Code>POST /api/ai/invoice</Code> parsuje český prompt pomocí sady regex vzorů — detekuje klienta (podle &quot;pro X&quot; / &quot;faktura X&quot;), hodiny, sazbu, splatnost a popis práce. Fuzzy-matchuje klienta proti DB, spočítá DPH z dodavatele, vytvoří fakturu a vrátí její ID.
        </p>
      </Section>

      <Section icon={Receipt} title="AI transkripce účtenek (Claude Vision)">
        <p>
          Endpoint <Code>POST /api/receipts/transcribe</Code> přijímá base64 obrázek a volá Claude Haiku 4.5 s vision capability. Model dostane účtenku a systémový prompt, který definuje JSON strukturu. Vrací:
        </p>
        <pre className="bg-muted/50 rounded-xl p-3 text-[11px] font-mono overflow-x-auto">
{`{
  "vendor": "Tesco Brno",
  "vendorIco": "45308314",
  "vendorDic": "CZ45308314",
  "date": "2026-04-12",
  "totalAmount": 256.50,
  "vatBase": 211.98,
  "vatAmount": 44.52,
  "vatRate": 21,
  "items": [{"name": "mléko", "quantity": 2, "unitPrice": 29.9, "vatRate": 12}],
  "note": null
}`}
        </pre>
        <p>
          Pokud chybí API klíč nebo kredity, endpoint vrátí chybu a frontend nechá účtenku uložit v <em>pending</em> stavu s prázdnými daty — uživatel ji může vyplnit ručně. Všechny účtenky projdou manuálním schválením (<Code>status: &quot;approved&quot;</Code>), i ty z AI. Do DPH kalkulace se započítávají jen schválené.
        </p>
        <p>
          Scan je uložen v DB jako base64 data URL (pole <Code>Receipt.scan</Code>). Toto je pragmatická volba pro SQLite — pro produkci s velkým objemem účtenek by bylo lepší ukládat na disk / S3 a v DB držet jen cestu.
        </p>
      </Section>

      <Section icon={Send} title="Odeslání účetní">
        <p>
          <Code>POST /api/receipts/send-to-accountant</Code> s tělem <Code>{'{ month: "YYYY-MM" }'}</Code>:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Načte dodavatele (<Code>supplier.accountantEmail</Code>)</li>
          <li>Načte schválené účtenky pro zadaný měsíc</li>
          <li>Načte faktury vystavené v měsíci — spočítá DPH na výstupu vs. vstupu</li>
          <li>Každý scan převede z base64 na <Code>Buffer</Code> a vloží jako e-mail attachment</li>
          <li>Přidá CSV souhrn se všemi účtenkami</li>
          <li>Odešle e-mail přes Resend s HTML tělem obsahujícím souhrn DPH</li>
          <li>Označí odeslané účtenky jako <Code>status: &quot;sent&quot;</Code></li>
        </ol>
      </Section>

      <Section icon={BarChart2} title="VAT summary endpoint">
        <p>
          <Code>GET /api/reports/vat-summary?year=YYYY&amp;month=MM</Code> vrací JSON se součty DPH pro zadaný měsíc nebo celý rok. Používá se jak v sekci Účtenky (pro měsíční kalkulačku), tak interně pro odesílání účetní.
        </p>
      </Section>

      <Section icon={RefreshCw} title="Fio API integrace">
        <p>
          Endpoint <Code>POST /api/fio/sync</Code> volá Fio REST API:
        </p>
        <pre className="bg-muted/50 rounded-xl p-3 text-[11px] font-mono overflow-x-auto">
{`https://fioapi.fio.cz/v1/rest/periods/{token}/{from}/{to}/transactions.json`}
        </pre>
        <p>
          Filtruje kladné transakce, páruje je podle <Code>VS == invoice.number</Code> a <Code>částka == totalAmount</Code> (tolerance 1 Kč). Shodné faktury označí jako <Code>PAID</Code>. Ukládá <Code>fioLastSync</Code>, aby příští sync načítal jen nové transakce.
        </p>
        <p className="text-muted-foreground">
          <strong>Rate limit:</strong> Fio API povoluje 1 request za 30 sekund na token.
        </p>
      </Section>

      <Section icon={Globe} title="Klientský portál (public share)">
        <p>
          <Code>POST /api/invoices/[id]/share</Code> vygeneruje náhodný 16B token (<Code>crypto.randomBytes</Code>), uloží ho do <Code>invoice.publicToken</Code> a vrátí URL.
        </p>
        <p>
          Stránka <Code>app/public/invoice/[token]/page.tsx</Code> je server component mimo layout se sidebarem — je přístupná komukoliv s platným tokenem. <Code>DELETE</Code> na stejný endpoint token zneplatní.
        </p>
      </Section>

      <Section icon={Code2} title="Dark mode bez knihovny">
        <p>
          V <Code>app/layout.tsx</Code> je <Code>&lt;script&gt;</Code> v <Code>&lt;head&gt;</Code>, který před hydratací React čte <Code>localStorage.theme</Code> a nastaví třídu <Code>dark</Code> na <Code>&lt;html&gt;</Code> — tím se eliminuje flash of wrong theme.
        </p>
        <p>
          Hook <Code>useTheme()</Code> v <Code>components/layout/theme-provider.tsx</Code> používá <Code>useState</Code> a přepíná třídu + localStorage. Žádná <Code>next-themes</Code> není potřeba (a s React 19 by ani nefungovala, protože injektuje script uvnitř komponenty).
        </p>
      </Section>

      <Section icon={Settings} title="Environment proměnné">
        <p>Nastavené v <Code>.env</Code>:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><Code>DATABASE_URL</Code> — <Code>file:./dev.db</Code></li>
          <li><Code>RESEND_API_KEY</Code> — klíč z resend.com pro odesílání e-mailů</li>
          <li><Code>EMAIL_FROM</Code> — odesílací e-mail (ověřená doména)</li>
          <li><Code>ANTHROPIC_API_KEY</Code> — pro budoucí Claude API (aktuálně nepoužito)</li>
        </ul>
      </Section>

      <Section icon={Layers} title="InvoiceItem model">
        <p>
          Faktury mají relaci <Code>items: InvoiceItem[]</Code> s polemi <Code>description</Code>, <Code>quantity</Code>, <Code>unit</Code> (h/ks/den/měsíc/kg/m/l), <Code>unitPrice</Code>, <Code>vatRate</Code>, <Code>order</Code>. Totaly se počítají v <Code>lib/invoice-items.ts</Code> přes <Code>calcTotals(items, round)</Code>. Legacy faktury bez items se zobrazí přes <Code>legacyItemFromInvoice()</Code>.
        </p>
      </Section>

      <Section icon={Globe} title="Kurz ČNB">
        <p>
          <Code>lib/cnb-rates.ts</Code> fetchuje denní kurzy z <Code>cnb.cz/.../denni_kurz.txt</Code>, parsuje pipe-delimited formát a cachuje 1 hodinu in-memory. Při vytvoření non-CZK faktury se kurz uloží do <Code>invoice.exchangeRate</Code>.
        </p>
      </Section>

      <Section icon={FileCode} title="Pohoda XML export">
        <p>
          <Code>GET /api/invoices/pohoda-export?year=&amp;month=</Code> generuje mPohoda dataPack XML se jmennými prostory <Code>dat:</Code>, <Code>inv:</Code>, <Code>typ:</Code>. Každá faktura je <Code>inv:invoice</Code> s hlavičkou, detail položkami a souhrnem.
        </p>
      </Section>

      <Section icon={FileCode} title="DPH XML (KH1 + DP3)">
        <p>
          <Code>GET /api/tax/kh1?year=&amp;month=</Code> — Kontrolní hlášení DPHKH1 se sekcemi A.4 (přijatá plnění s DIČ nad 10k), A.5 (ostatní), B.2 (vystavená s DIČ nad 10k), B.3 (zjednodušené).
        </p>
        <p>
          <Code>GET /api/tax/dp3?year=&amp;month=</Code> — DPH přiznání DPHDP3 s řádky 1-2 (výstup), 40-41 (vstup), 62 (k platbě).
        </p>
      </Section>

      <Section icon={Cpu} title="Cron endpoint">
        <p>
          <Code>GET /api/cron?secret=XXX</Code> — veřejný endpoint (vlastní auth přes query secret). Provede recurring generate, SENT→OVERDUE update, auto-reminders. Loguje do AuditLog. Pro Vercel Cron stačí přidat do <Code>vercel.json</Code>.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="Health monitoring">
        <p>
          <Code>GET /api/health</Code> vrací JSON se stavem: DB, Resend, Claude AI, Fio, Tempo, Auth. Každá služba má status <Code>ok</Code> / <Code>warning</Code> / <Code>error</Code> / <Code>unconfigured</Code>.
        </p>
      </Section>

      <Section icon={Code2} title="Error logger">
        <p>
          <Code>lib/error-logger.ts</Code> — <Code>logError(context, error)</Code> loguje do konzole + volitelně do Sentry (pokud je nainstalovaný <Code>@sentry/nextjs</Code>). Helper <Code>withErrorLogging()</Code> pro wrapping.
        </p>
      </Section>

      <Section icon={Key} title="Autentizace">
        <p>
          Proxy (<Code>proxy.ts</Code>) — HMAC session cookie přes Web Crypto API (edge-safe). Bearer token auth pro API. Login stránka s AppShell skrytím sidebaru. Public paths: <Code>/login</Code>, <Code>/public/</Code>, <Code>/ical/</Code>, <Code>/api/cron</Code>.
        </p>
      </Section>

      <Section icon={Code2} title="Často používané příkazy">
        <pre className="bg-muted/50 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`npm run dev                    # dev server (port 3000)
npm run build                  # produkční build
npx prisma db push             # aplikuj schéma na DB
npx prisma generate            # regeneruj Prisma client
npx prisma studio              # GUI pro DB
sqlite3 prisma/dev.db          # přímý přístup k DB
curl localhost:3000/api/health # stav služeb
curl localhost:3000/api/cron   # manuální cron trigger
curl -X POST localhost:3000/api/seed  # demo data`}
        </pre>
        <p className="text-muted-foreground">
          <strong>Pozor:</strong> po změně schématu je nutné spustit <em>oba</em> příkazy — <Code>db push</Code> i <Code>generate</Code>. Pokud se dev server spustí před <Code>generate</Code>, dostaneš <Code>Cannot read properties of undefined</Code> chybu; stačí server restartovat.
        </p>
      </Section>
    </div>
  );
}
