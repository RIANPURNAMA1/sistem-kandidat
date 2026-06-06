import * as React from 'react'
import { cn } from '@/lib/utils'

// Simple toast implementation
interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastState: Toast[] = []
let listeners: Array<(toasts: Toast[]) => void> = []

function notify(listeners: Array<(t: Toast[]) => void>, toasts: Toast[]) {
  listeners.forEach(l => l(toasts))
}

export function toast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toastState = [...toastState, { id, title, description, variant }]
  notify(listeners, toastState)
  setTimeout(() => {
    toastState = toastState.filter(t => t.id !== id)
    notify(listeners, toastState)
  }, 4000)
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>(toastState)
  React.useEffect(() => {
    listeners.push(setToasts)
    return () => { listeners = listeners.filter(l => l !== setToasts) }
  }, [])
  return { toasts, toast }
}

export function Toaster() {
  const { toasts } = useToast()
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom-4',
            t.variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground border-destructive'
              : 'bg-card text-card-foreground'
          )}
        >
          <p className="text-sm font-semibold">{t.title}</p>
          {t.description && <p className="text-xs mt-1 opacity-80">{t.description}</p>}
        </div>
      ))}
    </div>
  )
}
