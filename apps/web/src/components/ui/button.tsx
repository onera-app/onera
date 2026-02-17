import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100 shadow-sm",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        outline:
          "border border-gray-200 dark:border-gray-800 bg-transparent shadow-sm hover:bg-gray-100 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-gray-100",
        secondary:
          "bg-gray-100 dark:bg-gray-850 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-800",
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-gray-100",
        link: "text-gray-900 dark:text-gray-100 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
