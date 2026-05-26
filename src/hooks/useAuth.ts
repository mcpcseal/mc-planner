import { useState, useCallback } from 'react'

const SESSION_KEY = 'mc_planner_auth'

function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated)

  const login = useCallback((password: string): boolean => {
    const correct = import.meta.env.VITE_APP_PASSWORD
    if (password === correct) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setAuthenticated(true)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthenticated(false)
  }, [])

  return { authenticated, login, logout }
}
