export function czechIBAN(bankCode: string, accountNumber: string): string {
  const bban = bankCode.padStart(4, "0") + accountNumber.padStart(16, "0");
  // CZ = C(12) Z(35) → append "1235" + "00" for check digit calculation
  const numeric = bban + "1235" + "00";
  const remainder = BigInt(numeric) % BigInt(97);
  const checkDigits = String(BigInt(98) - remainder).padStart(2, "0");
  return "CZ" + checkDigits + bban;
}

export function spaydString(params: {
  iban: string;
  amount: number;
  variableSymbol: string;
  message: string;
}): string {
  const am = params.amount.toFixed(2);
  return [
    "SPD*1.0",
    `ACC:${params.iban}`,
    `AM:${am}`,
    "CC:CZK",
    `X-VS:${params.variableSymbol}`,
    `MSG:${params.message}`,
  ].join("*");
}
