import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/useStore'

const navItems = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/web-info', label: 'Web情報', icon: '🌐' },
  { to: '/quiz', label: '知識確認', icon: '📝' },
  { to: '/essay', label: '論述練習', icon: '✍️' },
  { to: '/roleplay', label: 'ロープレ', icon: '🎭' },
  { to: '/empathy', label: '共感練習', icon: '💬' },
]

export default function Layout() {
  const { apiKey, setApiKey, level, setLevel } = useStore()
  const [showSettings, setShowSettings] = useState(false)
  const [keyInput, setKeyInput] = useState(apiKey)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">キャリコン学習</span>
            <div className="flex rounded-full overflow-hidden border border-indigo-400 text-sm">
              <button
                onClick={() => setLevel('2級')}
                className={`px-3 py-1 ${level === '2級' ? 'bg-white text-indigo-700 font-semibold' : 'text-indigo-200 hover:bg-indigo-600'}`}
              >
                2級
              </button>
              <button
                onClick={() => setLevel('1級')}
                className={`px-3 py-1 ${level === '1級' ? 'bg-white text-indigo-700 font-semibold' : 'text-indigo-200 hover:bg-indigo-600'}`}
              >
                1級
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className={`text-sm px-3 py-1 rounded-full border ${apiKey ? 'border-green-400 text-green-300' : 'border-yellow-400 text-yellow-300'} hover:bg-indigo-600`}
          >
            {apiKey ? '✓ API設定済み' : '⚠ APIキー未設定'}
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded-t text-sm whitespace-nowrap transition-colors ${isActive ? 'bg-white text-indigo-700 font-semibold' : 'text-indigo-200 hover:bg-indigo-600'}`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Gemini APIキー設定</h2>
            <p className="text-sm text-gray-600 mb-4">
              AI機能（採点・ロープレ・Web検索）にはGoogle Gemini APIキーが必要です。
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline ml-1"
              >
                Google AI Studioで無料取得
              </a>
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400 mb-4">
              キーはブラウザのlocalStorageに保存されます。第三者には送信されません。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setApiKey(keyInput)
                  setShowSettings(false)
                }}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
