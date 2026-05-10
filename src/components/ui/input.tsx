import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      // DS v2: 48px tall, surface bg, 0.5px line-strong border. Border
      // shifts to --accent on focus (no shadow). Placeholder uses ink-mute
      // (45% alpha) for that bistro-paper look.
      className={cn(
        "flex h-12 w-full rounded-[var(--radius-md)] border-[0.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-[15px] text-[var(--foreground)] placeholder:text-[var(--ink-mute)] transition-colors focus-visible:border-[var(--accent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
