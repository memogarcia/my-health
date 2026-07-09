import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function ChartEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <Empty className="rounded-md border border-dashed bg-muted/35 py-8">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
    </Empty>
  );
}
