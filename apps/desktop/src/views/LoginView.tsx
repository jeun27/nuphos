import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'

import { api } from '../api'
import { Button } from '../components/ui/button'
import { toast } from '../components/ui/toast'
import { useErrorShake } from '../hooks/useErrorShake'
import { useTextSwap } from '../hooks/useTextSwap'
import { signInEmailError } from '../lib/emailDomain'
import { cssDurationMs, prefersReducedMotion } from '../lib/motion'
import { OnboardingLogo } from '../lib/onboarding/OnboardingLogo'
import { OnboardingShell } from '../lib/onboarding/OnboardingShell'

import { CodeSlots } from './login/CodeSlots'
import { FacePyramid } from './login/FacePyramid'
import { LoginApiEndpoint } from './LoginApiEndpoint'

import type { UserInfo } from '../types'

type Props = {
  onLogin: (user: UserInfo) => void
}

const inputClasses =
  'w-full px-3 py-2 rounded-md bg-surface border border-zGray-800 text-main text-[14px] ' +
  'outline-none focus:border-zViolet-accent placeholder:text-secondary titlebar-no-drag t-input'

export function LoginView({ onLogin }: Props) {
  const [step, setStep] = useState<'start' | 'code'>('start')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const { ref: emailRef, shake: shakeEmail } = useErrorShake<HTMLInputElement>()
  const {
    ref: codeRef,
    shake: shakeCode,
    clear: clearCodeError,
  } = useErrorShake<HTMLInputElement>()
  const { ref: sendLabelRef, text: sendLabelText } = useTextSwap<HTMLSpanElement>(
    busy === 'send' && step === 'start' ? 'Sending code…' : 'Continue with email',
  )
  const { ref: verifyLabelRef, text: verifyLabelText } = useTextSwap<HTMLSpanElement>(
    busy === 'verify' ? 'Verifying…' : 'Verify code',
  )
  const { ref: resendLabelRef, text: resendLabelText } = useTextSwap<HTMLSpanElement>(
    busy === 'send' && step === 'code' ? 'Sending…' : 'Resend code',
  )
  const shownStep = useRef(step)
  const columnRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const [keepOut] = useState(() => [columnRef, headlineRef])

  // Both steps stay mounted for the slide, so focus the step's field once the
  // slide has settled instead of relying on autoFocus at mount.
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    const field = step === 'code' ? codeRef : emailRef
    const t = window.setTimeout(
      () => field.current?.focus(),
      prefersReducedMotion() ? 0 : cssDurationMs('--page-slide-dur', 250),
    )

    return () => window.clearTimeout(t)
  }, [step, codeRef, emailRef])

  // No in-flight guard: each click re-launches the auth flow so the user can
  // retry freely (e.g. after closing the browser window without finishing).
  async function handleGoogleLogin() {
    try {
      const user = await api.authLogin()

      onLogin(user)
    } catch (e) {
      toast.apiError('Sign-in failed', e, {
        fallback: 'Check your internet connection and try again.',
      })
    }
  }

  async function handleSendCode() {
    if (!email.trim() || busy) return
    const emailError = signInEmailError(email.trim())

    if (emailError) {
      shakeEmail()
      toast.error('Invalid email', emailError)

      return
    }
    setBusy('send')
    try {
      await api.authEmailRequestCode(email.trim())
      setCode('')
      clearCodeError()
      setStep('code')
    } catch (e) {
      toast.apiError('Failed to send code', e, {
        fallback: 'Check your internet connection and try again.',
      })
    } finally {
      setBusy(null)
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6 || busy) return
    setBusy('verify')
    try {
      const user = await api.authEmailVerifyCode(email.trim(), code)

      onLogin(user)
    } catch (e) {
      toast.apiError('Sign-in failed', e, {
        fallback: 'Check your internet connection and try again.',
      })
      setBusy(null)
      shakeCode()
      codeRef.current?.select()
    }
  }

  return (
    <OnboardingShell
      headline="Welcome to Nuphos"
      lead="The agent workspace for your team"
      top={<OnboardingLogo />}
      scene={<FacePyramid keepOut={keepOut} />}
      columnRef={columnRef}
      headlineRef={headlineRef}
    >
      <div className="t-page-slide t-wizard-slide w-full" data-page={step === 'start' ? 1 : 2}>
        <section className="t-page" data-page-id="1" inert={step !== 'start'}>
          <Button
            onClick={() => void handleGoogleLogin()}
            size="lg"
            className="ob-primary group w-full titlebar-no-drag"
          >
            <span className="flex flex-1 items-center gap-2">
              <FontAwesomeIcon icon={faGoogle} />
              Continue with Google
            </span>
            <FontAwesomeIcon
              icon={faArrowRight}
              className="text-[14px] transition-transform duration-200 group-hover:translate-x-1"
            />
          </Button>

          <div className="w-full flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-zGray-800" />
            <span className="text-[12px] text-secondary">or</span>
            <div className="h-px flex-1 bg-zGray-800" />
          </div>

          <form
            className="w-full flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSendCode()
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              ref={emailRef}
              className={`${inputClasses} ob-input`}
            />
            <p className="ob-helper">Personal and work emails are welcome.</p>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={!email.trim() || busy !== null}
              className="ob-outline w-full titlebar-no-drag"
            >
              <span ref={sendLabelRef} className="t-text-swap">
                {sendLabelText}
              </span>
            </Button>
          </form>
          <LoginApiEndpoint inputClassName={inputClasses} />
        </section>
        <section className="t-page" data-page-id="2" inert={step !== 'code'}>
          <form
            className="w-full flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              void handleVerifyCode()
            }}
          >
            <p id="login-code-label" className="text-[13.5px] text-secondary leading-relaxed">
              Enter the 6-digit code sent to{' '}
              <span className="text-main font-medium">{email.trim()}</span>
            </p>
            <CodeSlots
              value={code}
              inputRef={codeRef}
              labelledBy="login-code-label"
              onChange={(value) => {
                clearCodeError()
                setCode(value.replace(/\D/g, '').slice(0, 6))
              }}
            />
            <Button
              type="submit"
              size="lg"
              disabled={code.length !== 6 || busy !== null}
              className="ob-primary group w-full titlebar-no-drag"
            >
              <span className="flex flex-1 items-center">
                <span ref={verifyLabelRef} className="t-text-swap">
                  {verifyLabelText}
                </span>
              </span>
              <FontAwesomeIcon
                icon={faArrowRight}
                className="text-[14px] transition-transform duration-200 group-hover:translate-x-1"
              />
            </Button>
            <div className="flex items-center justify-between mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep('start')}
                className="ob-link titlebar-no-drag"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-[11px]" />
                Use a different email
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => void handleSendCode()}
                className="ob-link titlebar-no-drag"
              >
                <span ref={resendLabelRef} className="t-text-swap">
                  {resendLabelText}
                </span>
              </Button>
            </div>
          </form>
        </section>
      </div>
    </OnboardingShell>
  )
}
