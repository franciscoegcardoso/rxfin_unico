import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        income: "bg-income text-white hover:bg-income/90 shadow-sm active:scale-[0.98]",
        expense: "bg-expense text-white hover:bg-expense/90 shadow-sm active:scale-[0.98]",
        hero: "gradient-primary text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-lg",
        sm: "h-8 px-3 text-xs rounded-lg",
        lg: "h-10 px-6 rounded-lg",
        xl: "h-11 px-8 rounded-lg",
        icon: "h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg touch-manipulation",
        "icon-sm": "h-8 w-8 min-h-[44px] min-w-[44px] rounded-lg touch-manipulation",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
