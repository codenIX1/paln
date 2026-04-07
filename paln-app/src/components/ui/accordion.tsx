import * as React from "react"
import { cn } from "@/lib/utils"

const Accordion = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} {...props} />
  )
)
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-b", className)} {...props} />
  )
)
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { content: React.ReactNode }>(
  ({ className, children, content, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const contentRef = React.useRef<HTMLDivElement>(null)

    return (
      <div>
        <button
          ref={ref}
          className={cn(
            "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
            className
          )}
          onClick={() => setIsOpen(!isOpen)}
          data-state={isOpen ? "open" : "closed"}
          {...props}
        >
          {children}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted-foreground transition-transform duration-200"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        <div
          ref={contentRef}
          className="overflow-hidden text-sm"
          style={{
            maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : "0px",
            transition: "max-height 0.2s ease-out"
          }}
        >
          {content}
        </div>
      </div>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("overflow-hidden text-sm pb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
