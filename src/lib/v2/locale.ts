// AGRI-GRID V2 — safe BCP-47 tag for Intl APIs.
// i18next can return environment tags (e.g. "en-US@posix") that Intl rejects.
export function localeTag(lang: string | undefined | null): string {
  return lang?.toLowerCase().startsWith("fr") ? "fr-FR" : "en-GB";
}
