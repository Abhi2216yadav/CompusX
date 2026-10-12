import { useEffect, useRef, useState } from 'react'

/** Debounces a rapidly-changing value (search boxes, filters). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** True while the viewport matches the given media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** Locks body scroll while a modal or drawer is open. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [active])
}

/** Fires a callback on Escape — used by modals and command palettes. */
export function useEscape(active: boolean, onEscape: () => void) {
  const ref = useRef(onEscape)
  // Refreshed in an effect, not during render, so the latest callback is used
  // without mutating a ref while React is rendering.
  useEffect(() => {
    ref.current = onEscape
  })
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active])
}

/** Closes a popover when the user clicks outside of it. */
export function useClickOutside<T extends HTMLElement>(
  active: boolean,
  onOutside: () => void
) {
  const ref = useRef<T>(null)
  const handlerRef = useRef(onOutside)
  useEffect(() => {
    handlerRef.current = onOutside
  })
  useEffect(() => {
    if (!active) return
    const handler = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handlerRef.current()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [active])
  return ref
}
