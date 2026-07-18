import {useCallback, useEffect, useRef, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import {
  fetchDocumentsPage,
  filterDocumentsInMemory,
  saveDocument as saveDocumentRequest,
  deleteDocument as deleteDocumentRequest,
  DEFAULT_PAGE_SIZE,
  type DocumentRecord,
  type SaveDocumentInput,
} from '@/lib/documents'
import {
  getCachedDocuments,
  mergeCachedDocuments,
  upsertCachedDocument,
  deleteCachedDocument,
} from '@/lib/offlineCache'
import type {SummaryLanguage} from '@/types'

export interface UseDocumentsOptions {
  searchTerm?: string
  languageFilter?: SummaryLanguage | 'all'
  pageSize?: number
}

// Todas las opciones tienen default, asi que useDocuments() sin argumentos
// (como lo sigue llamando SummarizePage, que solo necesita saveDocument)
// no cambia de comportamiento.
export function useDocuments(options: UseDocumentsOptions = {}) {
  const {
    searchTerm = '',
    languageFilter = 'all',
    pageSize = DEFAULT_PAGE_SIZE,
  } = options
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Contador de "generacion" de pedido: cada refresh() lo incrementa: una
  // respuesta que llega despues de que el usuario ya cambio de busqueda o
  // filtro (o de una tipeada rapida) se descarta en vez de pisar el estado
  // con datos viejos.
  const requestIdRef = useRef(0)

  const loadPage = useCallback(
    async (cursor?: string) => {
      if (!user) throw new Error('No hay sesión activa.')
      const docs = await fetchDocumentsPage({
        userId: user.id,
        searchTerm,
        languageFilter,
        cursor,
        pageSize,
      })
      // Fire-and-forget: el cache es un espejo acumulado (ver
      // mergeCachedDocuments), no debe bloquear la actualizacion de la UI.
      mergeCachedDocuments(user.id, docs)
      return docs
    },
    [user, searchTerm, languageFilter, pageSize]
  )

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current

    if (!user) {
      setDocuments([])
      setIsFromCache(false)
      setHasMore(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasError(false)
    try {
      const docs = await loadPage()
      if (requestIdRef.current !== requestId) return
      setDocuments(docs)
      setIsFromCache(false)
      setHasMore(docs.length === pageSize)
    } catch (err) {
      console.error(err)
      if (requestIdRef.current !== requestId) return
      // Sin red: se filtra en memoria sobre el cache acumulado, que es por
      // definicion un subconjunto de lo que existe en Supabase (tope de 50,
      // solo lo que se llego a ver online). No hay "cargar mas" en este
      // modo — hasMore queda en false a proposito, no hay de donde traer
      // una pagina siguiente sin red.
      const cached = await getCachedDocuments(user.id)
      const filtered = filterDocumentsInMemory(cached, {
        searchTerm,
        languageFilter,
      })
      if (cached.length > 0) {
        setDocuments(filtered)
        setIsFromCache(true)
        setHasMore(false)
      } else {
        setHasError(true)
      }
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false)
    }
  }, [user, loadPage, pageSize, searchTerm, languageFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!user || isLoadingMore || !hasMore || documents.length === 0) return
    const requestId = requestIdRef.current

    setIsLoadingMore(true)
    try {
      const cursor = documents[documents.length - 1].created_at
      const nextDocs = await loadPage(cursor)
      if (requestIdRef.current !== requestId) return
      setDocuments((prev) => [...prev, ...nextDocs])
      setHasMore(nextDocs.length === pageSize)
    } catch (err) {
      console.error(err)
      // Se quedo sin red mientras pedia la siguiente pagina: no hay mas
      // para agregar desde el cache (el fallback offline de refresh() ya
      // trajo todo lo que hay filtrado), se corta la paginacion.
      if (requestIdRef.current === requestId) setHasMore(false)
    } finally {
      if (requestIdRef.current === requestId) setIsLoadingMore(false)
    }
  }, [user, isLoadingMore, hasMore, documents, loadPage, pageSize])

  const saveDocument = useCallback(
    async (input: Omit<SaveDocumentInput, 'userId'>) => {
      if (!user) throw new Error('No hay sesión activa.')
      const result = await saveDocumentRequest({ ...input, userId: user.id })
      // El recien guardado se antepone siempre, sin importar la
      // busqueda/filtro actual — el usuario que acaba de guardar algo
      // espera verlo de inmediato.
      setDocuments((prev) => [result.document, ...prev])
      // La cache principal de IndexedDB solo refleja guardados confirmados
      // en Supabase. Si quedo 'pending', useSync la agrega recien cuando
      // el reintento tenga exito — asi el fallback offline de refresh()
      // nunca muestra un documento que en realidad todavia no llego al
      // servidor.
      if (result.status === 'saved') upsertCachedDocument(result.document)
      return result
    },
    [user]
  )

  const deleteDocument = useCallback(async (id: string) => {
    // Requiere red (ver comentario en lib/documents.ts) — si falla, se
    // propaga tal cual para que HistoryPage muestre el error, sin tocar
    // el estado local ni la cache.
    await deleteDocumentRequest(id)
    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    await deleteCachedDocument(id)
  }, [])

  return {
    documents,
    isLoading,
    isLoadingMore,
    hasError,
    isFromCache,
    hasMore,
    loadMore,
    saveDocument,
    deleteDocument,
    refresh,
  }
}
