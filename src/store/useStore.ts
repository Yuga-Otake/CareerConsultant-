import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface QuizProgress {
  correct: number
  total: number
  wrongIds: string[]
}

interface EssayRecord {
  questionId: string
  answer: string
  score: number
  feedback: string
  date: string
}

export interface RoleplayMessage {
  role: 'user' | 'client' | 'system'
  text: string
}

export interface RoleplaySession {
  id: string
  scenarioId: string
  scenarioTitle: string
  clientProfile: string
  messages: RoleplayMessage[]
  feedback: string
  date: string
  completed: boolean
}

interface AppState {
  apiKey: string
  level: '2級' | '1級'
  quizProgress: QuizProgress
  essayRecords: EssayRecord[]
  roleplaySessions: RoleplaySession[]
  setApiKey: (key: string) => void
  setLevel: (level: '2級' | '1級') => void
  recordQuizAnswer: (id: string, correct: boolean) => void
  addEssayRecord: (record: EssayRecord) => void
  saveRoleplaySession: (session: RoleplaySession) => void
  deleteRoleplaySession: (id: string) => void
  resetProgress: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      level: '2級',
      quizProgress: { correct: 0, total: 0, wrongIds: [] },
      essayRecords: [],
      roleplaySessions: [],
      setApiKey: (key) => set({ apiKey: key }),
      setLevel: (level) => set({ level }),
      recordQuizAnswer: (id, correct) =>
        set((state) => ({
          quizProgress: {
            correct: correct ? state.quizProgress.correct + 1 : state.quizProgress.correct,
            total: state.quizProgress.total + 1,
            wrongIds: correct
              ? state.quizProgress.wrongIds.filter((wid) => wid !== id)
              : state.quizProgress.wrongIds.includes(id)
                ? state.quizProgress.wrongIds
                : [...state.quizProgress.wrongIds, id],
          },
        })),
      addEssayRecord: (record) =>
        set((state) => ({ essayRecords: [record, ...state.essayRecords.slice(0, 19)] })),
      saveRoleplaySession: (session) =>
        set((state) => {
          const exists = state.roleplaySessions.some((s) => s.id === session.id)
          const updated = exists
            ? state.roleplaySessions.map((s) => (s.id === session.id ? session : s))
            : [session, ...state.roleplaySessions.slice(0, 29)]
          return { roleplaySessions: updated }
        }),
      deleteRoleplaySession: (id) =>
        set((state) => ({
          roleplaySessions: state.roleplaySessions.filter((s) => s.id !== id),
        })),
      resetProgress: () =>
        set({ quizProgress: { correct: 0, total: 0, wrongIds: [] }, essayRecords: [] }),
    }),
    { name: 'career-consultant-store' }
  )
)
