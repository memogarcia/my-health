export const MIN_DATABASE_PASSPHRASE_LENGTH = 12;

export function normalizeDatabasePassphrase(value: string): string {
  return value.trim();
}

export function isDatabasePassphraseLongEnough(value: string): boolean {
  return normalizeDatabasePassphrase(value).length >= MIN_DATABASE_PASSPHRASE_LENGTH;
}
