"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  color?: "primary" | "secondary" | "success" | "warning" | "danger"
  size?: "sm" | "md" | "lg"
  showValue?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, color = "primary", size = "md", showValue = false, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
    
    const getColorClass = () => {
      switch (color) {
        case "primary": return "bg-blue-500";
        case "secondary": return "bg-purple-500";
        case "success": return "bg-green-500";
        case "warning": return "bg-yellow-500";
        case "danger": return "bg-red-500";
        default: return "bg-blue-500";
      }
    };
    
    const getSizeClass = () => {
      switch (size) {
        case "sm": return "h-1";
        case "md": return "h-2";
        case "lg": return "h-3";
        default: return "h-2";
      }
    };
    
    return (
      <div className="relative w-full">
        <div
          ref={ref}
          className={cn(
            "w-full overflow-hidden rounded-full bg-gray-200",
            getSizeClass(),
            className
          )}
          {...props}
        >
          <div 
            className={cn(
              "h-full transition-all duration-300 ease-in-out",
              getColorClass()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <span className="absolute right-0 -top-6 text-xs font-medium">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    )
  }
)

Progress.displayName = "Progress"

export { Progress }
