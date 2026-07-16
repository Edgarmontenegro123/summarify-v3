import {RefreshCw} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {useLanguage} from '@/contexts/LanguageContext'
import {usePwaUpdate} from '@/hooks/usePwaUpdate'

export function UpdateBanner() {
  const { t } = useLanguage()
  const { needRefresh, updateApp, dismiss } = usePwaUpdate()

  if (!needRefresh) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-primary/10 px-4 py-2 text-center text-sm text-primary">
      <RefreshCw className="h-4 w-4 shrink-0" />
      <span>{t('update.available')}</span>
      <div className="flex gap-2">
        <Button size="xs" variant="ghost" onClick={dismiss}>
          {t('update.later')}
        </Button>
        <Button size="xs" variant="secondary" onClick={updateApp}>
          {t('update.reload')}
        </Button>
      </div>
    </div>
  )
}
