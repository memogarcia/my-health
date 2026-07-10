import { useEffect, useState } from "react";
import { t } from "../i18n";
import { markdownToSafeHtml } from "../markdown-output";

export function MarkdownOutput({ markdown }: { markdown: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function render(): Promise<void> {
      if (!markdown.trim()) {
        setHtml("");
        return;
      }
      const safeHtml = await markdownToSafeHtml(markdown);
      if (!cancelled) setHtml(safeHtml);
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [markdown]);

  if (!markdown.trim()) return <div className="markdown-output ProseMirror" tabIndex={0} aria-label={t("markdown.label")}>{t("markdown.empty")}</div>;
  return <div className="markdown-output ProseMirror" tabIndex={0} aria-label={t("markdown.label")} dangerouslySetInnerHTML={{ __html: html }} />;
}
