import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "cta" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary hover:bg-primary-hover text-white",
  secondary:
    "bg-transparent border border-border hover:bg-surface text-foreground",
  ghost:
    "bg-transparent hover:bg-surface text-text-muted hover:text-foreground",
  cta:
    "bg-teal hover:bg-teal/90 text-white",
  danger:
    "bg-error hover:bg-error/90 text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-xs px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-150",
          variantStyles[variant],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
