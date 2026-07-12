import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlignLeft, AlignJustify, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useSpeech } from "@/hooks/useSpeech";
import { useDocuments } from "@/hooks/useDocuments";
import { generateSummary } from "@/lib/summarize";
import { deriveTitle } from "@/lib/documents";
import type { DocumentRecord } from "@/lib/documents";
import type { SummaryMode } from "@/types";

// Pequeña espera artificial para que la generación se sienta como un
// proceso real en vez de un parpadeo instantáneo.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SummarizePage() {
  const { theme, toggleTheme } = useTheme();
  const speech = useSpeech();
  const { saveDocument } = useDocuments();
  const location = useLocation();

  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<SummaryMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Cuando venimos de "Recargar resumen" en /history, precargamos el
  // documento elegido en vez de arrancar de una pantalla vacía.
  useEffect(() => {
    const doc = (location.state as { document?: DocumentRecord } | null)?.document;
    if (!doc) return;

    setText(doc.original_text);
    if (doc.detailed_summary) {
      setSummary(doc.detailed_summary);
      setMode("detallado");
    } else if (doc.brief_summary) {
      setSummary(doc.brief_summary);
      setMode("breve");
    }
    setIsSaved(true);
  }, [location.state]);

  const handleTextChange = (value: string) => {
    setText(value);
    setIsSaved(false);
  };

  const handleSummarize = async (selectedMode: SummaryMode) => {
    if (!text.trim() || isLoading) return;

    speech.stop();
    setIsLoading(true);
    setError(null);
    setMode(selectedMode);
    setSummary("");
    setIsSaved(false);

    try {
      await delay(500 + Math.random() * 400);
      const result = generateSummary(text, selectedMode);

      if (!result.trim()) {
        setError("No se pudo generar el resumen. Intenta con otro texto.");
      } else {
        setSummary(result);
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al generar el resumen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summary || isSaving || isSaved) return;

    setIsSaving(true);
    try {
      await saveDocument({
        title: deriveTitle(text),
        originalText: text,
        briefSummary: mode === "breve" ? summary : null,
        detailedSummary: mode === "detallado" ? summary : null,
      });
      setIsSaved(true);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el resumen en tu historial.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:pt-24">
        <section className="mb-12 text-center animate-fade-in">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Resúmenes claros,
            <br />
            <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
              al instante.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Sube un PDF o pega tu texto. Summarify lo resume al instante y te
            lo lee en voz alta, en español.
          </p>
        </section>

        <div className="space-y-6">
          <UploadZone text={text} onTextChange={handleTextChange} disabled={isLoading} />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1 gap-2"
              disabled={!hasText || isLoading}
              onClick={() => handleSummarize("breve")}
            >
              {isLoading && mode === "breve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlignLeft className="h-4 w-4" />
              )}
              Resumen Breve
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1 gap-2"
              disabled={!hasText || isLoading}
              onClick={() => handleSummarize("detallado")}
            >
              {isLoading && mode === "detallado" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlignJustify className="h-4 w-4" />
              )}
              Resumen Detallado
            </Button>
          </div>

          <SummaryPanel
            summary={summary}
            mode={mode}
            isLoading={isLoading}
            error={error}
            isSpeechSupported={speech.isSupported}
            isSpeaking={speech.isSpeaking}
            isPaused={speech.isPaused}
            onSpeak={() => speech.speak(summary)}
            onPause={speech.pause}
            onResume={speech.resume}
            onStop={speech.stop}
            onSave={handleSave}
            isSaving={isSaving}
            isSaved={isSaved}
          />
        </div>
      </main>

      <footer className="border-t border-border/60 py-8">
        <p className="text-center text-xs text-muted-foreground">
          Summarify — hecho con React, TypeScript y un motor de resumen 100%
          local (sin APIs externas).
        </p>
      </footer>
    </div>
  );
}
