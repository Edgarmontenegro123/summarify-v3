import {useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {Loader2, Send, FileWarning, MailCheck} from 'lucide-react'
import {AuthLayout} from '@/components/AuthLayout'
import {Card, CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {useAuth} from '@/contexts/AuthContext'
import {useLanguage} from '@/contexts/LanguageContext'

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: resetError } = await resetPasswordForEmail(email.trim())
    setIsSubmitting(false)

    if (resetError) {
      setError(resetError)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout
        title={t('forgotPassword.successTitle')}
        subtitle={t('forgotPassword.successSubtitle', { email })}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <MailCheck className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('forgotPassword.successBody')}
            </p>
            <Link to="/login" className="mt-2">
              <Button variant="secondary">
                {t('forgotPassword.backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
    >
      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('forgotPassword.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('forgotPassword.emailPlaceholder')}
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
                <Send className="h-4 w-4" />
              )}
              {t('forgotPassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
