import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8"
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

interface LoadingStateProps {
  message?: string
  size?: "sm" | "md" | "lg"
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading...", 
  size = "md" 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <LoadingSpinner size={size} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

const LoadingSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-muted", className)}
    {...props}
  />
))
LoadingSkeleton.displayName = "LoadingSkeleton"

export { LoadingSpinner, LoadingState, LoadingSkeleton }