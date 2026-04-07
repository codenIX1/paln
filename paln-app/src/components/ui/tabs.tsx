import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void }>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const [activeTab, setActiveTab] = React.useState(value || "")
    
    React.useEffect(() => {
      if (value !== undefined) setActiveTab(value)
    }, [value])

    React.useEffect(() => {
      if (activeTab && onValueChange) {
        onValueChange(activeTab)
      }
    }, [activeTab, onValueChange])

    return (
      <div ref={ref} className={cn("w-full", className)} data-value={activeTab} {...props} />
    )
  }
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(
  ({ className, value, ...props }, ref) => {
    const tabs = React.useContext(TabsContext)
    const isActive = tabs?.value === value
    
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive && "bg-background text-foreground shadow-sm",
          className
        )}
        data-state={isActive ? "active" : "inactive"}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, value, ...props }, ref) => {
    const tabs = React.useContext(TabsContext)
    const isActive = tabs?.value === value
    
    if (!isActive) return null
    
    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        data-state="active"
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

const TabsContext = React.createContext<{ value?: string }>({ value: "" })

export { Tabs, TabsList, TabsTrigger, TabsContent }
