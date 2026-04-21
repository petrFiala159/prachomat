// Interpolace {{placeholder}} v textu e-mailu.
// Podporuje jednoduché klíče, žádné podmínky ani cykly.

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

export const DEFAULT_INVOICE_SUBJECT = "Faktura č. {{number}} – {{supplier}}";

export const DEFAULT_INVOICE_BODY = `Dobrý den,

zasílám fakturu č. {{number}} ve výši {{amount}} se splatností {{dueDate}}.

Faktura je v příloze jako PDF.

S pozdravem,
{{supplier}}`;

export const DEFAULT_REMINDER_SUBJECT = "Upomínka – faktura č. {{number}} po splatnosti";

export const DEFAULT_REMINDER_BODY = `Dobrý den,

dovolujeme si Vás upozornit, že faktura č. {{number}} ve výši {{amount}} je {{daysOverdue}} dní po splatnosti (splatnost byla {{dueDate}}).

Prosíme o co nejrychlejší úhradu. V případě, že již byla platba odeslána, prosím ignorujte tuto zprávu.

S pozdravem,
{{supplier}}`;
