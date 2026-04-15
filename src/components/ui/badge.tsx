import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline" | "destructive";
}) {
  const variants: Record<string, string> = {
    default: "border-transparent bg-slate-900 text-slate-50",
    secondary: "border-transparent bg-slate-100 text-slate-900",
    outline: "text-slate-950 border-slate-200",
    destructive: "border-transparent bg-red-500 text-slate-50",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
