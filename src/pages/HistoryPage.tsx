import {useEffect, useMemo, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  WifiOff,
} from 'lucide-react'
import {Header} from '@/components/Header'
import {Card, CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {cn} from '@/lib/utils'
import {useTheme} from '@/contexts/ThemeContext'
import {useDocuments} from '@/hooks/useDocuments'
import {useLanguage} from '@/contexts/LanguageContext'
import type {DocumentRecord} from '@/lib/documents'
import type {SummaryLanguage} from '@/types'

type LanguageFilter = SummaryLanguage | 'all'

const FILTER_OPTIONS: { value: LanguageFilter; labelKey: 'history.filterAll' | 'history.filterEs' | 'history.filterEn' }[] = [
  { value: 'all', labelKey: 'history.filterAll' },
  { value: 'es', labelKey: 'history.filterEs' },
  { value: 'en', labelKey: 'history.filterEn' },
]

const SEARCH_DEBOUNCE_MS = 300

export function HistoryPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()
  const navigate = useNavigate()

  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState(false)

  // Debounce del buscador: no dispara un fetch por cada tecla, solo
  // cuando el usuario deja de tipear un rato.
  useEffect(() => {
    const timeout = setTimeout(
      () => setSearchTerm(searchInput),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timeout)
  }, [searchInput])

  const {
    documents,
    isLoading,
    isLoadingMore,
    hasError,
    isFromCache,
    hasMore,
    loadMore,
    deleteDocument,
  } = useDocuments({ searchTerm, languageFilter })

  const isFiltering = searchTerm.trim() !== '' || languageFilter !== 'all'

  // Formatea cada fecha con el locale del idioma de la UI (no del idioma
  // del resumen guardado), consistente con el resto de las etiquetas.
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language]
  )

  // Scroll infinito: el sentinel dispara loadMore() al entrar en viewport.
  // rootMargin adelanta la carga un poco antes de que el usuario llegue al
  // final real, para que se sienta continuo.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

  const handleReload = (doc: DocumentRecord) => {
    navigate('/', { state: { document: doc } })
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeletingId(id)
    setDeleteError(false)
    try {
      await deleteDocument(id)
    } catch (err) {
      console.error(err)
      setDeleteError(true)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:pt-24">
        <section className="mb-10 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 gap-1.5 px-2 text-muted-foreground"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('history.back')}
          </Button>

          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('history.title')}
          </h1>
          <p className="mt-2 text-balance text-muted-foreground">
            {t('history.subtitle')}
          </p>
        </section>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label={t('history.searchAria')}
              placeholder={t('history.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>

          <div
            role="group"
            aria-label={t('history.filterLabel')}
            className="flex w-fit items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5"
          >
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguageFilter(option.value)}
                aria-pressed={languageFilter === option.value}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors',
                  languageFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {deleteError && (
          <Card className="mb-4 animate-fade-in">
            <CardContent className="p-4 text-sm text-destructive">
              {t('history.deleteError')}
            </CardContent>
          </Card>
        )}

        {isFromCache && isFiltering && (
          <div className="mb-4 flex animate-fade-in items-start gap-2 rounded-xl bg-amber-500/15 p-3 text-xs text-amber-600 dark:text-amber-400">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{t('history.limitedOfflineResults')}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && hasError && (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              {t('history.loadError')}
            </CardContent>
          </Card>
        )}

        {!isLoading && !hasError && documents.length === 0 && (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <History className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t(isFiltering ? 'history.filterEmpty' : 'history.empty')}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !hasError && documents.length > 0 && (
          <div className="space-y-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="animate-fade-in">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {doc.title}
                        </p>
                        {isFromCache && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <WifiOff className="h-3 w-3" />
                            {t('history.offlineBadge')}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(doc.created_at))} ·{' '}
                        {doc.detailed_summary
                          ? t('history.tagDetailed')
                          : t('history.tagBrief')}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleReload(doc)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {t('history.reload')}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('history.deleteAria')}
                      disabled={deletingId === doc.id}
                      onClick={() => setConfirmDeleteId(doc.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {isLoadingMore && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('history.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('history.deleteConfirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('history.deleteCancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              {t('history.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
