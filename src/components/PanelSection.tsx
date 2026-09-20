import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface PanelSectionProps {
  title: string
  className?: string
  trailing?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

export function PanelSection({ title, className = '', trailing, children, defaultOpen = true }: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`panel collapsible-panel ${className}`}>
      <div className="panel-header">
        <button className="panel-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <h3>{title}</h3>
          <ChevronDown className={open ? '' : 'collapsed'} size={16} aria-hidden="true" />
        </button>
        {trailing && <div className="panel-trailing">{trailing}</div>}
      </div>
      {open && <div className="panel-content">{children}</div>}
    </section>
  )
}
