export type DatabaseStatus = {
  dbPath: string;
  state: "needsSetup" | "locked" | "legacyPlaintext" | "unlocked";
  configured: boolean;
  unlocked: boolean;
  hasLegacyPlaintext: boolean;
  requiresEncryption: boolean;
};
