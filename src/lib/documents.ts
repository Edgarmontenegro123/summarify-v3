import {supabase} from '@/lib/supabase'
import type {SummaryLanguage} from '@/types'

export interface DocumentRecord {
  id: string
  user_id: string
  title: string
  original_text: string
  brief_summary: string | null
  detailed_summary: string | null
  summary_language: SummaryLanguage
  created_at: string
}

export interface SaveDocumentInput {
  userId: string
  title: string
  originalText: string
  briefSummary?: string | null
  detailedSummary?: string | null
  summaryLanguage: SummaryLanguage
}

const RECENT_DOCUMENTS_LIMIT = 5

export async function fetchRecentDocuments(
  userId: string
): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(RECENT_DOCUMENTS_LIMIT)

  if (error) throw error
  return data ?? []
}

export async function saveDocument(
  input: SaveDocumentInput
): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: input.userId,
      title: input.title,
      original_text: input.originalText,
      brief_summary: input.briefSummary ?? null,
      detailed_summary: input.detailedSummary ?? null,
      summary_language: input.summaryLanguage,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Primeras ~60 chars del texto original como titulo automatico, cortado en
// un espacio para no partir una palabra a la mitad.
export function deriveTitle(text: string, maxLen = 60): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (normalized.length <= maxLen) return normalized

  const cut = normalized.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 20 ? lastSpace : maxLen)}…`
}
