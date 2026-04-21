"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Sparkles, ArrowRight, Loader2 } from "lucide-react";

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

const EXAMPLES = [
  "Faktura pro MALFINI, 40 hodin vývoje",
  "Freelance práce pro Alza 20h, sazba 1800 Kč",
  "Konzultace pro Skoda Auto, 8 hodin",
];

export function AiInvoiceBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setHasSpeech(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "cs-CZ";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setPrompt(transcript);
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chyba AI");

      // Faktura vytvořena — přesměruj na detail
      router.push(`/invoices/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo");
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Vytvořit fakturu pomocí AI</p>
          <p className="text-xs text-muted-foreground">Napiš nebo nadiktuj co fakturovat — AI vyplní formulář za tebe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={EXAMPLES[Math.floor(Date.now() / 10000) % EXAMPLES.length]}
            disabled={loading}
            className="w-full h-10 rounded-xl border border-input bg-background px-4 pr-10 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 transition-colors"
          />
          {hasSpeech && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              title={listening ? "Zastavit nahrávání" : "Diktovat"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                listening
                  ? "text-red-500 animate-pulse"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {loading ? "Analyzuji..." : "Vytvořit"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setPrompt(ex); inputRef.current?.focus(); }}
            className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
