import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        reviewing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        fixed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        wont_fix: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      },
      priority: {
        low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
        medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      },
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: "open" | "reviewing" | "fixed" | "wont_fix"
  priority?: "low" | "medium" | "high" | "critical"
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, priority, children, ...props }, ref) => {
    const variant = status ? { status } : priority ? { priority } : {}
    
    return (
      <div
        className={cn(statusBadgeVariants(variant), className)}
        ref={ref}
        {...props}
      >
        {children || status || priority}
      </div>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants }