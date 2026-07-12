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
  const dark = preference === "dark" || (preference !== "light" && environment.prefersDark);
  return {
    colorScheme: dark ? "dark" : "light",
    contrast: environment.prefersContrast || environment.forcedColors === true,
    dark,
  };
}

export function applyResolvedTheme(root: HTMLElement, theme: ResolvedTheme): void {
  root.classList.toggle("dark", theme.dark);
  root.classList.toggle("contrast", theme.contrast);
  root.dataset.theme = theme.colorScheme;
  root.dataset.contrast = theme.contrast ? "more" : "normal";
  root.style.colorScheme = theme.colorScheme;
}
