/** Live Firestore (or demo-store) subscription with loading + error state. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/services'
import type {
  CollectionName,
  ListOptions,
  Unsubscribe,
} from '@/services/db'

export interface QueryResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
  refresh: () => void
}

export function useCollection<T = Record<string, unknown>>(
  col: CollectionName,
  opts?: ListOptions,
  deps: unknown[] = []
): QueryResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)
  const optsKey = JSON.stringify(opts ?? {})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    let unsubscribe: Unsubscribe | null = null
    try {
      unsubscribe = db.subscribe<T>(
        col,
        opts,
        (rows) => {
          if (!mounted.current) return
          setData(rows)
          setLoading(false)
          setError(null)
        },
        (e) => {
          if (!mounted.current) return
          setError(e)
          setLoading(false)
        }
      )
    } catch (e) {
      setError(e as Error)
      setLoading(false)
    }
    return () => unsubscribe?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, optsKey, nonce, ...deps])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, refresh }
}

/** Fetches a single document, re-running whenever `deps` change. */
export function useDocument<T = Record<string, unknown>>(
  col: CollectionName,
  id: string | null,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    db.get<T>(col, id)
      .then((doc) => {
        if (!active) return
        setData(doc)
        setError(null)
      })
      .catch((e) => active && setError(e as Error))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, id, ...deps])

  return { data, loading, error }
}

/** Async data loader for derived computations (leaderboard, analytics, search). */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options: { initial?: T } = {}
): { data: T | undefined; loading: boolean; error: Error | null; reload: () => void } {
  const [data, setData] = useState<T | undefined>(options.initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fn()
      .then((result) => {
        if (!active) return
        setData(result)
        setError(null)
      })
      .catch((e) => {
        if (!active) return
        setError(e as Error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, reload: () => setNonce((n) => n + 1) }
}
