import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Role, School, UserProfile } from '@/services/types'
import { COLLECTIONS, type AuthUser } from '@/services/db'
import { db, isDemoMode } from '@/services'
import { defaultSchoolId } from '@/firebase/config'

interface AuthContextValue {
  /** Firebase auth user, or null. */
  authUser: AuthUser | null
  /** CampusX profile document (role, class, section, roll no…). */
  profile: UserProfile | null
  school: School | null
  role: Role | null
  loading: boolean
  /** True when signed in but the profile document is still missing. */
  needsOnboarding: boolean
  demoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid: string, fallbackEmail = '') => {
    const found = await db.get<UserProfile>(COLLECTIONS.users, uid)
    if (found) {
      setProfile(found)
      const s = await db.get<School>(COLLECTIONS.schools, found.schoolId ?? defaultSchoolId)
      setSchool(s)
      return found
    }
    // Google sign-ins land here on first use — build a draft student profile.
    setProfile(null)
    const s = await db.get<School>(COLLECTIONS.schools, defaultSchoolId)
    setSchool(s)
    void fallbackEmail
    return null
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = db.onAuth(async (user) => {
      setAuthUser(user)
      try {
        if (user) await loadProfile(user.uid, user.email)
        else {
          setProfile(null)
          setSchool(null)
        }
      } finally {
        // Never leave the app on an infinite loader if the profile read fails.
        if (active) setLoading(false)
      }
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(
    // The `db.onAuth` subscription above loads the profile for the new uid,
    // so awaiting the credential here is enough.
    async (email: string, password: string) => {
      await db.signIn(email, password)
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const user = await db.signUp(email, password, name)
      await loadProfile(user.uid, email)
    },
    [loadProfile]
  )

  const signInWithGoogle = useCallback(async () => {
    const user = await db.signInWithGoogle()
    await loadProfile(user.uid, user.email)
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await db.signOut()
    setProfile(null)
    setAuthUser(null)
  }, [])

  const resetPassword = useCallback((email: string) => db.resetPassword(email), [])

  const refreshProfile = useCallback(async () => {
    if (authUser) await loadProfile(authUser.uid, authUser.email)
  }, [authUser, loadProfile])

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!authUser) return
      await db.update(COLLECTIONS.users, authUser.uid, { ...patch, updatedAt: Date.now() })
      await loadProfile(authUser.uid, authUser.email)
    },
    [authUser, loadProfile]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      profile,
      school,
      role: profile?.role ?? null,
      loading,
      needsOnboarding: Boolean(authUser && !profile),
      demoMode: isDemoMode,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      refreshProfile,
      updateProfile,
    }),
    [
      authUser, profile, school, loading, signIn, signUp, signInWithGoogle,
      signOut, resetPassword, refreshProfile, updateProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
