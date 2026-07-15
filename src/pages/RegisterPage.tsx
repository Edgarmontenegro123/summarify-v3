import {useState, type FormEvent} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {Loader2, UserPlus, FileWarning, MailCheck} from 'lucide-react'
import {AuthLayout} from '@/components/AuthLayout'
import {Card, CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {useAuth} from '@/contexts/AuthContext'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    const { error: signUpError, needsEmailConfirmation } = await signUp(
      email.trim(),
      password
    )
    setIsSubmitting(false)

    if (signUpError) {
      setError(signUpError)
      return
    }

    if (needsEmailConfirmation) {
      setConfirmationSent(true)
      return
    }

    navigate('/', { replace: true })
  }

  if (confirmationSent) {
    return (
      <AuthLayout
        title="Revisá tu correo"
        subtitle={`Te enviamos un enlace de confirmación a ${email}.`}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <MailCheck className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              Confirmá tu cuenta desde ese correo y después volvé acá para
              iniciar sesión.
            </p>
            <Link to="/login" className="mt-2">
              <Button variant="secondary">Ir a iniciar sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Creá tu cuenta"
      subtitle="Registrate para guardar y volver a escuchar tus resúmenes."
    >
      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
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
                placeholder="vos@ejemplo.com"
                className="h-11 rounded-xl px-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-11 rounded-xl px-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
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
                <UserPlus className="h-4 w-4" />
              )}
              Crear cuenta
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
