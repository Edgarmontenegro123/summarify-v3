import type { SummaryMode } from "@/types";

// Palabras vacías en español: no aportan significado para puntuar oraciones.
const STOPWORDS_ES = new Set(
  `de la que el en y a los del se las por un para con no una su al lo como
   más pero sus le ya o este sí porque esta entre cuando muy sin sobre
   también me hasta hay donde quien desde todo nos durante todos uno les
   ni contra otros ese eso ante ellos e esto mí antes algunos qué unos yo
   otro otras otra él tanto esa estos mucho quienes nada muchos cual poco
   ella estar estas algunas algo nosotros mi mis tú te ti tu tus ellas
   nosotras vosotros vosotras os mío mía míos mías tuyo tuya tuyos tuyas
   suyo suya suyos suyas nuestro nuestra nuestros nuestras vuestro vuestra
   vuestros vuestras esos esas estoy estás está estamos estáis están esté
   son fue ser sido siendo he ha han habrá había eran era son somos sea
   seremos serán fueron será tiene tienen tener tuvo hace hacer hizo cada
   sin cómo dónde cuál cuáles esto eso aquello aquí allí ahí sobre bajo`
    .split(/\s+/)
    .filter(Boolean)
);

const SENTENCE_SPLIT_RE = /(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"«])|(?<=[.!?…])\n+/g;

// Viñetas y guiones de lista: los PDFs suelen perder los saltos de línea al
// extraer el texto, así que un bloque con viñetas queda pegado en una sola
// "oración" gigante si no se corta aquí primero.
const BULLET_SPLIT_RE = /\s*[•●▪‣∙◦]\s*/g;

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const segments = normalized.split(BULLET_SPLIT_RE).filter(Boolean);

  const sentences: string[] = [];
  for (const segment of segments) {
    const parts = segment
      .split(SENTENCE_SPLIT_RE)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    sentences.push(...parts);
  }

  return sentences;
}

const URL_TEST_RE = /https?:\/\/\S+|www\.\S+/i;

function stripUrls(sentence: string): string {
  return sentence.replace(/https?:\/\/\S+|www\.\S+/gi, " ");
}

function tokenizeWords(sentence: string): string[] {
  return (
    stripUrls(sentence)
      .toLowerCase()
      .match(/[a-záéíóúñü]+/g) || []
  ).filter((w) => w.length > 2 && !STOPWORDS_ES.has(w));
}

function buildWordFrequencies(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>();

  for (const sentence of sentences) {
    for (const word of tokenizeWords(sentence)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }

  const max = Math.max(1, ...freq.values());
  for (const [word, count] of freq) {
    freq.set(word, count / max);
  }

  return freq;
}

function scoreSentences(sentences: string[], freq: Map<string, number>): number[] {
  return sentences.map((sentence, index) => {
    const words = tokenizeWords(sentence);
    const wordScore = words.reduce((sum, w) => sum + (freq.get(w) || 0), 0);
    const lengthNormalized = wordScore / Math.sqrt(Math.max(words.length, 1));

    let bonus = 0;
    if (index === 0) bonus += 0.15;
    else if (index === 1) bonus += 0.08;
    if (index === sentences.length - 1) bonus += 0.05;
    if (/\d/.test(sentence)) bonus += 0.05;
    if (/[a-záéíóúñ]\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(sentence)) bonus += 0.03;

    // Las oraciones que son mayormente un enlace aportan poco a un resumen
    // hablado: se deprioritizan en vez de excluirse por completo.
    const penalty = URL_TEST_RE.test(sentence) ? 0.5 : 1;

    return lengthNormalized * penalty + bonus;
  });
}

function pickTopSentences(sentences: string[], scores: number[], count: number): string[] {
  const ranked = sentences
    .map((sentence, index) => ({ sentence, index, score: scores[index] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index);

  return ranked.map((r) => r.sentence);
}

const MIN_SENTENCES_TO_SUMMARIZE = 3;

export function generateSummary(rawText: string, mode: SummaryMode): string {
  const sentences = splitSentences(rawText);

  if (sentences.length < MIN_SENTENCES_TO_SUMMARIZE) {
    return rawText.trim();
  }

  const freq = buildWordFrequencies(sentences);
  const scores = scoreSentences(sentences, freq);

  if (mode === "breve") {
    const count = Math.min(5, Math.max(2, Math.round(sentences.length * 0.2)));
    const selected = pickTopSentences(sentences, scores, count);
    return selected.join(" ");
  }

  const count = Math.min(12, Math.max(4, Math.round(sentences.length * 0.45)));
  const selected = pickTopSentences(sentences, scores, count);
  const [lead, ...rest] = selected;

  if (rest.length === 0) return lead;

  return `${lead}\n\n${rest.map((s) => `• ${s}`).join("\n")}`;
}
