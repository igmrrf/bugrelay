"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  statusColors,
  priorityColors,
  type BugStatus,
  type BugPriority,
} from "@/lib/design-tokens";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wide transition-all",
  {
    variants: {
      variant: {
        status: "rounded-full",
        priority: "rounded-md",
      },
      status: {
        open: "bg-[hsl(220_100%_95%)] text-[hsl(220_100%_30%)] border border-[hsl(220_100%_85%)] dark:bg-[hsl(220_100%_15%)] dark:text-[hsl(220_100%_80%)] dark:border-[hsl(220_100%_25%)]",
        reviewing:
          "bg-[hsl(45_100%_90%)] text-[hsl(45_100%_30%)] border border-[hsl(45_100%_75%)] dark:bg-[hsl(45_100%_20%)] dark:text-[hsl(45_100%_80%)] dark:border-[hsl(45_100%_30%)]",
        fixed:
          "bg-[hsl(140_60%_90%)] text-[hsl(140_60%_30%)] border border-[hsl(140_60%_75%)] dark:bg-[hsl(140_60%_20%)] dark:text-[hsl(140_60%_80%)] dark:border-[hsl(140_60%_30%)]",
        wont_fix:
          "bg-[hsl(0_0%_90%)] text-[hsl(0_0%_40%)] border border-[hsl(0_0%_75%)] dark:bg-[hsl(0_0%_20%)] dark:text-[hsl(0_0%_70%)] dark:border-[hsl(0_0%_30%)]",
      },
      priority: {
        low: "bg-[hsl(0_0%_90%)] text-[hsl(0_0%_40%)] border border-[hsl(0_0%_75%)] dark:bg-[hsl(0_0%_20%)] dark:text-[hsl(0_0%_70%)] dark:border-[hsl(0_0%_30%)]",
        medium:
          "bg-[hsl(35_100%_90%)] text-[hsl(35_100%_35%)] border border-[hsl(35_100%_75%)] dark:bg-[hsl(35_100%_20%)] dark:text-[hsl(35_100%_75%)] dark:border-[hsl(35_100%_30%)]",
        high: "bg-[hsl(15_90%_90%)] text-[hsl(15_90%_35%)] border border-[hsl(15_90%_75%)] dark:bg-[hsl(15_90%_20%)] dark:text-[hsl(15_90%_75%)] dark:border-[hsl(15_90%_30%)]",
        critical:
          "bg-[hsl(0_85%_90%)] text-[hsl(0_85%_35%)] border border-[hsl(0_85%_75%)] font-semibold dark:bg-[hsl(0_85%_20%)] dark:text-[hsl(0_85%_75%)] dark:border-[hsl(0_85%_30%)]",
      },
    },
    defaultVariants: {
      variant: "status",
    },
  },
);

export interface StatusBadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: BugStatus;
  priority?: BugPriority;
  showIcon?: boolean;
}

const statusIcons: Record<BugStatus, string> = {
  open: "○",
  reviewing: "◐",
  fixed: "●",
  wont_fix: "⊘",
};

const statusLabels: Record<BugStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  fixed: "Fixed",
  wont_fix: "Won't Fix",
};

const priorityLabels: Record<BugPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  (
    { className, status, priority, showIcon = true, children, ...props },
    ref,
  ) => {
    // Determine which variant to use
    const variant = status ? "status" : "priority";
    const variantValue = (status || priority) as string;

    // Get the appropriate label
    const label = status
      ? statusLabels[status]
      : priority
        ? priorityLabels[priority]
        : "";

    // Get icon if applicable
    const icon = status && showIcon ? statusIcons[status] : null;
    const priorityIcon =
      priority && showIcon ? priorityColors[priority].icon : null;

    // For critical priority, always show warning emoji
    const displayIcon = priority === "critical" ? "⚠️" : icon || priorityIcon;

    return (
      <div
        ref={ref}
        className={cn(
          statusBadgeVariants({
            variant,
            status: status as any,
            priority: priority as any,
          }),
          className,
        )}
        role="status"
        aria-label={`${variant}: ${label}`}
        {...props}
      >
        {showIcon && displayIcon && (
          <span aria-hidden="true" className="leading-none">
            {displayIcon}
          </span>
        )}
        <span>{children || label}</span>
      </div>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };
