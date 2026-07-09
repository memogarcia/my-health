import * as React from "react"

import { cn } from "@/lib/utils"

/* Lightweight content container: a heading row plus content, with no border,
   background, or shadow. Use this for grouped previews inside a Card or for
   page subsections that do not need to read as discrete objects. Reserve
   Card for things that need their own boundary. */

function Section({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="section"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function SectionHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    />
  )
}

function SectionTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="section-title"
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SectionAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-action"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

function SectionContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-content"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

export { Section, SectionHeader, SectionTitle, SectionAction, SectionContent }
