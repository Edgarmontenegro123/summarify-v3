import {useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {
  Loader2,
  KeyRound,
  FileWarning,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'
import {AuthLayout} from '@/components/AuthLayout'
import {Card, CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {useAuth} from '@/contexts/AuthContext'
import {useLanguage} from '@/contexts/LanguageContext'

export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const { t } = useLanguage()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError(t('resetPassword.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }

    setIsSubmitting(true)
    const { error: updateError } = await updatePassword(password)
    setIsSubmitting(false)

    if (updateError) {
      setError(updateError)
      return
    }

    setUpdated(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <AuthLayout
        title={t('resetPassword.invalidLinkTitle')}
        subtitle={t('resetPassword.invalidLinkSubtitle')}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <Link to="/forgot-password" className="mt-2">
              <Button variant="secondary">
                {t('resetPassword.requestNewLink')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  if (updated) {
    return (
      <AuthLayout
        title={t('resetPassword.successTitle')}
        subtitle={t('resetPassword.successSubtitle')}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <Link to="/" className="mt-2">
              <Button variant="secondary">
                {t('resetPassword.continueButton')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
    >
      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl px-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">
                {t('resetPassword.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl px-4"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {t('resetPassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
