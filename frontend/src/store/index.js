import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export const useStore = create(
  persist(
    (set, get) => ({
      groqApiKey: '',
      setGroqApiKey: (k) => set({ groqApiKey: k }),

      // Current review result (not saved yet)
      currentReview: null,
      setCurrentReview: (r) => set({ currentReview: r }),
      clearCurrentReview: () => set({ currentReview: null }),

      // Saved history
      history: [],
      loading: false,
      error: null,

      reviewPaste: async ({ code, filename, language, save, title }) => {
        set({ loading: true, error: null })
        try {
          const r = await fetch(`${API}/review/paste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code, filename, language, save, title,
              groq_api_key: get().groqApiKey || undefined,
            }),
          })
          const data = await r.json()
          if (!r.ok) throw new Error(data.detail || 'Review failed')
          set({ currentReview: data })
          if (save) set(s => ({ history: [data, ...s.history] }))
          return data
        } catch (e) {
          set({ error: e.message })
          throw e
        } finally {
          set({ loading: false })
        }
      },

      reviewPR: async ({ pr_url, save }) => {
        set({ loading: true, error: null })
        try {
          const r = await fetch(`${API}/review/pr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pr_url, save,
              groq_api_key: get().groqApiKey || undefined,
            }),
          })
          const data = await r.json()
          if (!r.ok) throw new Error(data.detail || 'PR review failed')
          set({ currentReview: data })
          if (save) set(s => ({ history: [data, ...s.history] }))
          return data
        } catch (e) {
          set({ error: e.message })
          throw e
        } finally {
          set({ loading: false })
        }
      },

      saveCurrentReview: async () => {
        const { currentReview } = get()
        if (!currentReview || currentReview.id) return
        try {
          const r = await fetch(`${API}/review/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: currentReview.title,
              source_type: currentReview.source_type,
              source_url: currentReview.source_url,
              language: currentReview.language,
              code_snippet: currentReview.code_snippet,
              comments: currentReview.comments,
              summary: currentReview.summary,
              stats: currentReview.stats,
              model_used: currentReview.model_used,
            }),
          })
          const data = await r.json()
          set(s => ({ currentReview: data, history: [data, ...s.history] }))
          return data
        } catch (e) {
          set({ error: e.message })
        }
      },

      fetchHistory: async () => {
        try {
          const r = await fetch(`${API}/review/history`)
          const data = await r.json()
          set({ history: data })
        } catch (e) { console.error(e) }
      },

      deleteReview: async (id) => {
        await fetch(`${API}/review/${id}`, { method: 'DELETE' })
        set(s => ({ history: s.history.filter(r => r.id !== id) }))
      },

      loadReview: (review) => set({ currentReview: review }),
    }),
    { name: 'codereview-store', partialState: (s) => ({ groqApiKey: s.groqApiKey }) }
  )
)
