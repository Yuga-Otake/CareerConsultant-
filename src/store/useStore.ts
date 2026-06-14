import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface QuizProgress {
  correct: number
  total: number
  wrongIds: string[]
}

export interface EssayFollowUpMessage {
  role: 'user' | 'ai'
  text: string
}

export interface EssayRecord {
  id?: string
  questionId: string
  answer: string
  score: number
  feedback: string
  date: string
  followUp?: EssayFollowUpMessage[]
}

export interface EmpathyRecord {
  id: string
  scenarioId: string
  level: '初級' | '中級' | '上級'
  situation: string
  statement: string
  response: string
  feedback: string
  score: number
  date: string
}

export interface RoleplayMessage {
  role: 'user' | 'client' | 'system'
  text: string
}

export interface EssayDraft {
  questionId: string
  answer: string
  subAnswers: string[]
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
  empathyRecords: EmpathyRecord[]
  roleplaySessions: RoleplaySession[]
  setApiKey: (key: string) => void
  setLevel: (level: '2級' | '1級') => void
  recordQuizAnswer: (id: string, correct: boolean) => void
  addEssayRecord: (record: EssayRecord) => void
  updateEssayRecord: (id: string, followUp: EssayFollowUpMessage[]) => void
  deleteEssayRecord: (id: string) => void
  addEmpathyRecord: (record: EmpathyRecord) => void
  deleteEmpathyRecord: (id: string) => void
  essayDraft: EssayDraft | null
  setEssayDraft: (draft: EssayDraft | null) => void
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
      essayDraft: null,
      empathyRecords: [],
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
        set((state) => ({ essayRecords: [record, ...state.essayRecords.slice(0, 29)] })),
      updateEssayRecord: (id, followUp) =>
        set((state) => ({
          essayRecords: state.essayRecords.map((r) =>
            r.id === id ? { ...r, followUp } : r
          ),
        })),
      deleteEssayRecord: (id) =>
        set((state) => ({
          essayRecords: state.essayRecords.filter((r) => r.id !== id),
        })),
      setEssayDraft: (draft) => set({ essayDraft: draft }),
      addEmpathyRecord: (record) =>
        set((state) => ({ empathyRecords: [record, ...state.empathyRecords.slice(0, 49)] })),
      deleteEmpathyRecord: (id) =>
        set((state) => ({
          empathyRecords: state.empathyRecords.filter((r) => r.id !== id),
        })),
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
