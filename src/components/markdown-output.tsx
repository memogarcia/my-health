import { useEffect, useRef } from "react";
import { defineBasicExtension } from "prosekit/basic";
import { createEditor, union, type Editor } from "prosekit/core";
import { defineReadonly } from "prosekit/extensions/readonly";
import { t } from "../i18n";
import { markdownToSafeHtml } from "../markdown-output";

export function MarkdownOutput({ markdown }: { markdown: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let editor: Editor | null = null;
    let cancelled = false;
    async function mount(): Promise<void> {
      const target = ref.current;
      if (!target) return;
      if (!markdown.trim()) {
        target.textContent = t("markdown.empty");
        return;
      }
      const html = await markdownToSafeHtml(markdown);
      if (cancelled || !ref.current) return;
      editor = createEditor({
        extension: union(defineBasicExtension(), defineReadonly()),
        defaultContent: html,
      });
      editor.mount(ref.current);
    }
    void mount();
    return () => {
      cancelled = true;
      editor?.unmount();
    };
  }, [markdown]);

  return <div ref={ref} className="markdown-output ProseMirror" tabIndex={0} aria-label={t("markdown.label")} />;
}
