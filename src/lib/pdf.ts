import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import {reportPdfError} from '@/lib/pdfDebugBus'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Se lanza cuando getTextContent falla para todas las paginas y con todas
// las variantes de parametros probadas — UploadZone.tsx la distingue del
// resto de los errores (fetch/lectura de archivo) para mostrar un mensaje
// especifico en vez del generico "error al leer el PDF".
export class PdfIncompatibleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfIncompatibleError'
  }
}

// Envuelve una llamada puntual a pdfjs-dist y le agrega, al error, en que
// paso especifico ocurrio — "undefined is not a function" solo no alcanza
// para saber si fallo cargando el documento, pidiendo una pagina, o
// extrayendo su contenido. El catch de extractTextFromPdf sigue siendo el
// unico lugar que loguea/reporta, esto solo enriquece el mensaje antes de
// que llegue ahi.
async function withPdfStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    throw new Error(`[${step}] ${detail}`)
  }
}

// Variantes de parametros para reintentar getTextContent tras un fallo.
// El primer intento (sin objeto = defaults de pdfjs-dist) ya es
// includeMarkedContent: false, asi que NO se repite acá — reintentar con
// el mismo valor no cambiaria nada. Las dos siguientes sí ejercitan una
// rama interna distinta de la libreria: includeMarkedContent: true salta
// el filtrado de contenido marcado: false, disableNormalization: true
// salta la normalizacion Unicode que corre en el worker por defecto. No
// hay forma de confirmar cual (si alguna) esquiva el bug real de WebKit
// sin probar en un dispositivo real — esto es la mejor aproximacion
// disponible con la API publica de pdfjs-dist.
const TEXT_CONTENT_RETRY_PARAMS = [
  { includeMarkedContent: true },
  { disableNormalization: true },
] as const

// Intenta extraer el texto de una pagina probando, en orden, los defaults
// y despues cada variante de TEXT_CONTENT_RETRY_PARAMS. Si todas fallan,
// no aborta el documento entero por una sola pagina problematica: resigna
// esa pagina (string vacio) y deja que el resto siga.
async function extractPageText(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>['getPage']>>,
  pageNum: number
): Promise<string> {
  const attempts = [undefined, ...TEXT_CONTENT_RETRY_PARAMS]

  for (let i = 0; i < attempts.length; i++) {
    const params = attempts[i]
    try {
      const content = await page.getTextContent(params)
      return content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    } catch (error) {
      console.error(
        `getTextContent fallo en pagina ${pageNum}, intento ${i + 1}/${attempts.length}` +
          (params ? ` (${JSON.stringify(params)})` : ' (default)'),
        error
      )
    }
  }

  return ''
}

export async function extractTextFromPdf(file: File): Promise<string> {
  console.log(`Iniciando lectura de PDF, tamaño: ${file.size} bytes`)

  try {
    const arrayBuffer = await file.arrayBuffer()

    const pdf = await withPdfStep('getDocument', () =>
      pdfjsLib.getDocument({
        data: arrayBuffer,
        // "Modo compatibilidad": pdfjs-dist v6 no expone un flag publico
        // para forzar "sin worker" — la propia libreria ya reintenta sola
        // con un worker "fake" en el hilo principal si el worker real
        // falla o no completa su handshake (PDFWorker#setupFakeWorker en
        // pdf.mjs; #isWorkerDisabled es un campo privado de la clase, no
        // configurable desde afuera), asi que chequear window.Worker no
        // cambiaria nada. Lo que si podemos apagar son rutas de codigo mas
        // nuevas — WASM, OffscreenCanvas, ImageDecoder — que un WebKit
        // especifico podria no soportar del todo. No las necesitamos para
        // extraer texto (son para decodificar/renderizar imagenes), asi
        // que desactivarlas no debería afectar la extraccion en ninguna
        // plataforma, y es la version real de "modo legacy" que esta
        // libreria permite configurar.
        useWasm: false,
        isOffscreenCanvasSupported: false,
        isImageDecoderSupported: false,
      }).promise
    )

    const pageTexts: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await withPdfStep(`getPage(${pageNum})`, () => pdf.getPage(pageNum))
      pageTexts.push(await extractPageText(page, pageNum))
    }

    const combined = pageTexts.join('\n\n').replace(/\s+\n/g, '\n').trim()

    // extractPageText ya reintento cada pagina con varias variantes antes
    // de resignarse — si aun asi no quedo nada de texto en ninguna pagina,
    // no tiene sentido devolver un string vacio silencioso (UploadZone.tsx
    // lo interpretaria como "parece un PDF escaneado", que es un mensaje
    // erroneo para este caso real).
    if (!combined && pdf.numPages > 0) {
      throw new PdfIncompatibleError(
        `No se pudo extraer texto de ninguna de las ${pdf.numPages} paginas con ningun metodo disponible.`
      )
    }

    return combined
  } catch (error) {
    console.error('Error de lectura PDF (Detalle):', error)
    reportPdfError(error)
    throw error
  }
}
