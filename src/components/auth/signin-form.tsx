'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Github, Mail } from 'lucide-react'

export function SignInForm({
  githubEnabled,
  googleEnabled,
}: {
  githubEnabled: boolean
  googleEnabled: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.code === 'rate_limited') {
          setError('尝试过于频繁，请稍后再试')
        } else {
          setError('邮箱或密码错误')
        }
      } else {
        router.push('/admin')
        router.refresh()
      }
    } catch (error) {
      setError('登录失败,请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <Link href="/" className="text-link auth-card__back">
          ← 返回首页
        </Link>
        <h1>登录</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div role="alert" className="auth-form__error">
              {error}
            </div>
          )}

          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
            placeholder="admin@example.com"
          />

          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field"
            placeholder="••••••••"
          />

          <button type="submit" disabled={isLoading} className="btn btn--primary auth-form__submit">
            {isLoading ? '登录中…' : '登录'}
          </button>
        </form>

        {(githubEnabled || googleEnabled) && (
          <div className="auth-card__alt">
            <p>使用其他账号登录</p>
            {githubEnabled && (
              <button
                disabled={isLoading}
                onClick={() => signIn('github', { callbackUrl: '/' })}
                className="btn"
              >
                <Github size={18} />
                GitHub
              </button>
            )}
            {googleEnabled && (
              <button
                disabled={isLoading}
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="btn"
              >
                <Mail size={18} />
                Google
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
