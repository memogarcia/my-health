import { useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resultDocumentAccept } from "../document-intake";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { FileText, Plus } from "./health-icons";

export function AddResultDropdown({ controller }: { controller: DashboardController }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(0);

  function choose(value: string): void {
    setKey((current) => current + 1);
    if (value === "individual") controller.openDialog("lab");
    if (value === "document") inputRef.current?.click();
  }

  return (
    <>
      <Select key={key} onValueChange={choose}>
        <SelectTrigger aria-label={t("addResult.label")} size="sm">
          <SelectValue placeholder={<><Plus data-icon="inline-start" />{t("addResult.label")}</>} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="individual"><Plus />{t("addResult.individual")}</SelectItem>
            <SelectItem value="document"><FileText />{t("addResult.document")}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <input
        accept={resultDocumentAccept}
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) controller.prepareDocumentResult(file);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
    </>
  );
}
