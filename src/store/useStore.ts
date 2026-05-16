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

interface AppState {
  apiKey: string
  level: '2級' | '1級'
  quizProgress: QuizProgress
  essayRecords: EssayRecord[]
  setApiKey: (key: string) => void
  setLevel: (level: '2級' | '1級') => void
  recordQuizAnswer: (id: string, correct: boolean) => void
  addEssayRecord: (record: EssayRecord) => void
  resetProgress: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      level: '2級',
      quizProgress: { correct: 0, total: 0, wrongIds: [] },
      essayRecords: [],
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
      resetProgress: () =>
        set({ quizProgress: { correct: 0, total: 0, wrongIds: [] }, essayRecords: [] }),
    }),
    { name: 'career-consultant-store' }
  )
)
