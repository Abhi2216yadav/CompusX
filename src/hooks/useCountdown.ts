import { useEffect, useRef, useState } from 'react'

/**
 * Deadline-based countdown.
 *
 * The hook stores an absolute `deadline` (epoch ms) and derives the remaining
 * time from `Date.now()` on every tick. Because it never counts down a stored
 * counter, refreshing the page, backgrounding the tab or sleeping the laptop
 * cannot make the timer drift — it always reflects real elapsed time. On
 * Firestore the same deadline is persisted with the attempt, so the server can
 * enforce the limit too.
 */
export function useCountdown(deadline: number | null, opts?: { onExpire?: () => void }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    deadline ? Math.max(0, deadline - Date.now()) : 0
  )
  const firedRef = useRef(false)
  const onExpireRef = useRef(opts?.onExpire)
  // Kept current in an effect rather than during render: writing a ref while
  // rendering is unsafe under concurrent rendering, and `onExpire` is usually an
  // inline arrow that changes identity on every render.
  useEffect(() => {
    onExpireRef.current = opts?.onExpire
  })

  useEffect(() => {
    firedRef.current = false
    if (!deadline) {
      setRemainingMs(0)
      return
    }

    const tick = () => {
      const left = Math.max(0, deadline - Date.now())
      setRemainingMs(left)
      if (left === 0 && !firedRef.current) {
        firedRef.current = true
        onExpireRef.current?.()
      }
    }

    tick()
    const interval = window.setInterval(tick, 250)
    // Re-sync when the tab regains focus so long background gaps are corrected.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [deadline])

  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    isExpired: remainingMs <= 0,
    isUrgent: remainingMs > 0 && remainingMs < 5 * 60_000,
    isCritical: remainingMs > 0 && remainingMs < 60_000,
  }
}

/** Formats seconds as `MM:SS` or `H:MM:SS`. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
