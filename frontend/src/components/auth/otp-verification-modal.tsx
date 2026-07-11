'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { useAuthStore } from '@/stores/auth-store'
import { sessionService } from '@/services/session-service'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, RotateCcw, Monitor, Globe } from 'lucide-react'

const OTP_EXPIRY_SECONDS = 300
const RESEND_COOLDOWN_SECONDS = 60

export function OtpVerificationModal() {
  const { pendingOtp, clearPendingOtp } = useAuthStore()
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [error, setError] = useState('')

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!pendingOtp) return
    setTimeLeft(OTP_EXPIRY_SECONDS)
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    setOtp('')
    setError('')
  }, [pendingOtp])

  useEffect(() => {
    if (!pendingOtp || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [pendingOtp, timeLeft])

  // Resend cooldown
  useEffect(() => {
    if (!pendingOtp || resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [pendingOtp, resendCooldown])

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }, [])

  const handleVerify = async () => {
    if (!pendingOtp || otp.length !== 6) return
    setVerifying(true)
    setError('')
    try {
      await sessionService.verifyOtp(pendingOtp.sessionId, otp)
      toast.success('Device verified successfully!')
      clearPendingOtp()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      if (message.includes('expired')) {
        setError('OTP has expired. Please request a new one.')
      } else if (message.includes('Invalid OTP')) {
        setError('Invalid OTP code. Please try again.')
      } else {
        setError(message)
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!pendingOtp || resendCooldown > 0) return
    setResending(true)
    try {
      await sessionService.resendOtp(pendingOtp.sessionId)
      setTimeLeft(OTP_EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtp('')
      setError('')
      toast.success('New OTP sent!')
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  if (!pendingOtp) return null

  const isExpired = timeLeft <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={clearPendingOtp}
      />
      <div className="relative z-10 w-full max-w-md mx-4">
        <button
          onClick={clearPendingOtp}
          className="absolute -top-2 -right-2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted z-20"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold">ViewTube</span>
            </div>
            <div className="mx-auto mb-2">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <ShieldCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl">Verify New Device</CardTitle>
            <CardDescription>
              We detected a new device signing in. Enter the 6-digit code sent to verify it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device info */}
            <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Device:</span>
                <span className="font-medium">{pendingOtp.device}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Browser:</span>
                <span className="font-medium">{pendingOtp.browser} on {pendingOtp.os}</span>
              </div>
            </div>

            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={verifying || isExpired}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <div key={index}>
                        <InputOTPSlot {...slot} />
                        {index === 2 && <InputOTPSeparator />}
                      </div>
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            {/* Timer */}
            <div className="text-center text-sm text-muted-foreground">
              {isExpired ? (
                <span className="text-destructive font-medium">Code has expired</span>
              ) : (
                <span>Expires in <span className="font-medium text-foreground">{formatTime(timeLeft)}</span></span>
              )}
            </div>

            {/* Verify button */}
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={otp.length !== 6 || verifying || isExpired}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Device'
              )}
            </Button>

            {/* Resend button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
            >
              {resending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : 'Resend code'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}