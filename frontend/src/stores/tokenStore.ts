/**
 * Token Store — Zustand + localStorage persistence.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocalToken {
  token: string
  remaining_generations: number
  expires_at: string
}

interface TokenState {
  tokens: LocalToken[]
  currentToken: LocalToken | null
  addToken: (token: LocalToken) => void
  removeToken: (tokenValue: string) => void
  updateTokenUsage: (tokenValue: string, remaining: number) => void
  setCurrentToken: (token: LocalToken | null) => void
  getActiveToken: () => LocalToken | null
  getTotalGenerations: () => number
  clearExpiredTokens: () => void
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      tokens: [],
      currentToken: null,

      addToken: (token) =>
        set((state) => ({
          tokens: [...state.tokens, token],
          currentToken: token,
        })),

      removeToken: (tokenValue) =>
        set((state) => ({
          tokens: state.tokens.filter((t) => t.token !== tokenValue),
          currentToken:
            state.currentToken?.token === tokenValue ? null : state.currentToken,
        })),

      updateTokenUsage: (tokenValue, remaining) =>
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.token === tokenValue ? { ...t, remaining_generations: remaining } : t
          ),
          currentToken:
            state.currentToken?.token === tokenValue
              ? { ...state.currentToken, remaining_generations: remaining }
              : state.currentToken,
        })),

      setCurrentToken: (token) => set({ currentToken: token }),

      getActiveToken: () => {
        const { tokens } = get()
        const now = new Date()
        return tokens.find(
          (t) => t.remaining_generations > 0 && new Date(t.expires_at) > now
        ) || null
      },

      getTotalGenerations: () => {
        const { tokens } = get()
        const now = new Date()
        return tokens
          .filter((t) => new Date(t.expires_at) > now)
          .reduce((sum, t) => sum + t.remaining_generations, 0)
      },

      clearExpiredTokens: () => {
        const now = new Date()
        set((state) => ({
          tokens: state.tokens.filter((t) => new Date(t.expires_at) > now),
        }))
      },
    }),
    { name: 'bad-review-tokens' }
  )
)
