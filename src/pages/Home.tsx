import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'

const studyTools = [
  {
    to: '/web-info',
    icon: '🌐',
    title: 'Web情報収集',
    description: 'AIが最新の試験情報・理論・法律をWeb検索してまとめます',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    iconBg: 'bg-blue-100',
  },
  {
    to: '/quiz',
    icon: '📝',
    title: '知識確認（一問一答）',
    description: 'キャリア理論・法律・倫理など重要テーマを繰り返し確認',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    iconBg: 'bg-green-100',
  },
  {
    to: '/essay',
    icon: '✍️',
    title: '論述練習',
    description: '事例問題に回答し、AIが4観点で採点・フィードバック',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    iconBg: 'bg-orange-100',
  },
]

export default function Home() {
  const { level, quizProgress, essayRecords, roleplaySessions, empathyRecords } = useStore()
  const accuracy = quizProgress.total > 0
    ? Math.round((quizProgress.correct / quizProgress.total) * 100)
    : null
  const completedRoleplays = roleplaySessions.filter((s) => s.completed).length

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">キャリアコンサルティング技能検定</h1>
        <p className="text-indigo-200 text-sm mb-4">現在の学習レベル：<span className="text-white font-semibold">{level}</span></p>
        <div className="grid grid-cols-3 gap-2 text-center mb-2">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{quizProgress.total}</div>
            <div className="text-xs text-indigo-200">クイズ回答数</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{accuracy !== null ? `${accuracy}%` : '—'}</div>
            <div className="text-xs text-indigo-200">正答率</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{essayRecords.length}</div>
            <div className="text-xs text-indigo-200">論述完了数</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-purple-500/25 border border-purple-400/30 rounded-xl p-3">
            <div className="text-2xl font-bold">{completedRoleplays}</div>
            <div className="text-xs text-purple-200">ロープレ完了</div>
          </div>
          <div className="bg-teal-500/25 border border-teal-400/30 rounded-xl p-3">
            <div className="text-2xl font-bold">{empathyRecords.length}</div>
            <div className="text-xs text-teal-200">共感練習回数</div>
          </div>
        </div>
      </div>

      {/* AI Practice — featured */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-gray-800">AI実践練習</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-600 text-white rounded-full tracking-wide">NEW</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/roleplay"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-800 to-purple-900 p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-10 -left-4 w-28 h-28 rounded-full bg-purple-500/10" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">🎭</div>
                <span className="text-[11px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">AI対話</span>
              </div>
              <h3 className="font-bold text-lg leading-tight mb-2">ロープレ練習</h3>
              <p className="text-sm text-indigo-200 leading-relaxed mb-4">
                AIがクライアント役を演じリアルな面談を体験。口頭試問→AIフィードバック・4観点採点まで本番さながらの流れで練習できます。
              </p>
              <div className="flex items-center justify-between">
                {completedRoleplays > 0
                  ? <span className="text-xs text-indigo-300">{completedRoleplays}回完了</span>
                  : <span className="text-xs text-indigo-400">まだ未実施</span>
                }
                <span className="text-sm font-medium text-indigo-200 group-hover:text-white group-hover:translate-x-0.5 transition-all">始める →</span>
              </div>
            </div>
          </Link>

          <Link
            to="/empathy"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-indigo-800 p-5 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-10 -left-4 w-28 h-28 rounded-full bg-teal-500/10" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">💬</div>
                <span className="text-[11px] font-bold bg-teal-300 text-teal-900 px-2 py-0.5 rounded-full">即時採点</span>
              </div>
              <h3 className="font-bold text-lg leading-tight mb-2">共感表現練習</h3>
              <p className="text-sm text-teal-100 leading-relaxed mb-4">
                クライアントの発言に共感表現を書き、AIが5観点で即採点。感情の反映・受容・共感の精度を段階的に磨けます。
              </p>
              <div className="flex items-center justify-between">
                {empathyRecords.length > 0
                  ? <span className="text-xs text-teal-300">{empathyRecords.length}回練習済み</span>
                  : <span className="text-xs text-teal-400">まだ未実施</span>
                }
                <span className="text-sm font-medium text-teal-200 group-hover:text-white group-hover:translate-x-0.5 transition-all">始める →</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Standard study tools */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">学習ツール</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {studyTools.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${f.color}`}
            >
              <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center text-2xl flex-shrink-0`}>
                {f.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{f.title}</div>
                <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{f.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Exam overview */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-semibold text-amber-800 mb-2">📌 試験の概要</h3>
        <div className="text-sm text-amber-700 space-y-1">
          <p><span className="font-medium">2級：</span>実務経験3年以上（又は養成講習修了後1年以上）。学科・実技（論述・面接）</p>
          <p><span className="font-medium">1級：</span>実務経験10年以上（2級合格後5年以上）。学科・実技（論述・面接・指導）</p>
          <p><span className="font-medium">主催：</span>キャリアコンサルティング協議会 / 日本キャリア開発協会（JCDA）</p>
        </div>
      </div>
    </div>
  )
}
