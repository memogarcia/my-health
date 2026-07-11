export type ThemePreference = "system" | "light" | "dark" | undefined;

type ThemeEnvironment = {
  prefersDark: boolean;
  prefersContrast: boolean;
  forcedColors?: boolean;
};

export type ResolvedTheme = {
  colorScheme: "light" | "dark";
  contrast: boolean;
  dark: boolean;
};

/** Pure theme resolution keeps platform media-query behavior testable. */
export function resolveTheme(preference: ThemePreference, environment: ThemeEnvironment): ResolvedTheme {
  const dark = preference === "dark" || (preference !== "light" && preference !== "dark" && environment.prefersDark);
  return {
    colorScheme: dark ? "dark" : "light",
    contrast: environment.prefersContrast || environment.forcedColors === true,
    dark,
  };
}
