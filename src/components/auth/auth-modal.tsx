'use client'

import { useAuthStore } from '@/stores/auth-store'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { useEffect, useCallback } from 'react'

export function AuthModal() {
  const { isLoginOpen, isRegisterOpen, closeAuthModals } = useAuthStore()

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAuthModals()
      }
    },
    [closeAuthModals]
  )

  useEffect(() => {
    if (isLoginOpen || isRegisterOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isLoginOpen, isRegisterOpen, handleEscape])

  if (!isLoginOpen && !isRegisterOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeAuthModals}
      />
      <div className="relative z-10 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto p-4">
        <button
          onClick={closeAuthModals}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted z-20"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {isLoginOpen && <LoginForm />}
        {isRegisterOpen && <RegisterForm />}
      </div>
    </div>
  )
}