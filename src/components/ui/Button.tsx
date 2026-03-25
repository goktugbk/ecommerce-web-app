// src/components/ui/Button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-black/90",
        outline: "border border-gray-300 bg-white hover:bg-gray-50",
        ghost: "hover:bg-gray-100",
        destructive: "bg-red-600 text-white hover:bg-red-600/90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Yükleniyor durumu: DOM'a forward edilmez */
  isLoading?: boolean;
  /** Butonu mantıksal olarak devre dışı bırakır (isLoading ile birleştirilir) */
  disabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled = false,
      children,
      ...rest // DİKKAT: isLoading artık burada YOK; DOM’a geçmeyecek
    },
    ref
  ) => {
    const Comp = asChild ? (Slot as any) : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        // isLoading DOM'a forward edilmesin: sadece erişilebilirlik & davranış
        aria-busy={isLoading || undefined}
        disabled={disabled || isLoading}
        data-loading={isLoading ? "" : undefined}
        {...rest}
      >
        {/* İstersen burada bir spinner gösterebilirsin */}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
