import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'

const features = [
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
  {
    to: '/roleplay',
    icon: '🎭',
    title: 'ロープレ練習',
    description: 'AIがクライアント役を演じ、面談技術をリアルに練習',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    iconBg: 'bg-purple-100',
  },
]

export default function Home() {
  const { level, quizProgress, essayRecords } = useStore()
  const accuracy = quizProgress.total > 0
    ? Math.round((quizProgress.correct / quizProgress.total) * 100)
    : null

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">キャリアコンサルティング技能検定</h1>
        <p className="text-indigo-200 text-sm mb-4">現在の学習レベル：<span className="text-white font-semibold">{level}</span></p>
        <div className="grid grid-cols-3 gap-3 text-center">
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
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">学習メニュー</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${f.color}`}
            >
              <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center text-2xl flex-shrink-0`}>
                {f.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-800">{f.title}</div>
                <div className="text-sm text-gray-600 mt-1">{f.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

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
