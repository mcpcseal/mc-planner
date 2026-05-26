import { useState, FormEvent } from 'react'
import { Lock } from 'lucide-react'

interface Props {
  onLogin: (password: string) => boolean
}

export function PasswordGate({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = onLogin(password)
    if (!ok) {
      setError(true)
      setShaking(true)
      setPassword('')
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div id="password-gate" className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-2xl mb-4">
            <span className="text-3xl">⛏️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MC Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">건축 재료 관리 도구</p>
        </div>

        <form
          id="password-form"
          onSubmit={handleSubmit}
          className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 ${shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        >
          <label htmlFor="password-input" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            <Lock size={14} className="inline mr-1.5 mb-0.5" />
            비밀번호
          </label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="비밀번호를 입력하세요"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border outline-none transition-colors
              ${error ? 'border-red-500 focus:border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-green-500'}`}
          />
          {error && (
            <p id="password-error" className="text-red-400 text-sm mt-2">비밀번호가 올바르지 않습니다.</p>
          )}
          <button
            id="login-button"
            type="submit"
            disabled={!password}
            className="w-full mt-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold transition-colors"
          >
            입장하기
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
