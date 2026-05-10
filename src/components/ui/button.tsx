import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// DS v2: rounded-rect not pill (radius 14 / md). Default 48px tall;
// `lg` is the canonical 52px CTA. Accent uses --accent-ink (cream) on
// terracotta — we no longer ride white-on-accent which was borderline.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium tracking-[-0.01em] transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:opacity-90",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
        accent:
          "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110",
        destructive:
          "bg-[var(--destructive)] text-white hover:brightness-110",
        outline:
          "border-[0.5px] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-warm-1)]",
        secondary:
          "bg-[var(--surface-warm-1)] text-[var(--foreground)] hover:bg-[var(--border-subtle-hover)]",
        ghost: "text-[var(--foreground)] hover:bg-[var(--border)]",
        link: "text-[var(--foreground)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-[var(--foreground)]",
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
