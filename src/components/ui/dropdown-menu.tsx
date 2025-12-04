import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end'
  className?: string
  children: React.ReactNode
}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => {} })

export function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  
  const setOpen = React.useCallback((value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }, [isControlled, onOpenChange])

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown-menu]')) {
        setOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setOpen])

  return (
    <DropdownMenuContext.Provider value={{ open: isOpen, setOpen }}>
      <div className="relative inline-block" data-dropdown-menu>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  const { open, setOpen } = React.useContext(DropdownMenuContext)
  
  const handleClick = () => setOpen(!open)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      'aria-expanded': open,
    })
  }
  
  return (
    <button onClick={handleClick} aria-expanded={open}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({ align = 'end', className, children }: DropdownMenuContentProps) {
  const { open } = React.useContext(DropdownMenuContext)
  
  if (!open) return null
  
  return (
    <div
      className={cn(
        'absolute z-50 mt-2 rounded-md border bg-white dark:bg-gray-900 shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        align === 'end' && 'right-0',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ 
  className, 
  children,
  onClick,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = React.useContext(DropdownMenuContext)
  
  return (
    <div
      className={cn(
        'px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}
