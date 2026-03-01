'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Loader2, ArrowRight, AlertTriangle, RotateCcw, Save, Check, ThumbsUp, ThumbsDown, BookOpen, FlaskConical, Brain } from 'lucide-react';
import { API_URL } from '../api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  diagnosticData?: DiagnosticData | null;
}

interface DiagnosticOption {
  name: string;
  pertinence: 'haute' | 'moyenne' | 'basse';
  slug?: string;
}

interface DiagnosticData {
  score_confiance: number;
  zone: string;
  concern: string;
  options: DiagnosticOption[];
  risques: string[];
  questions_praticien: string[];
  safety_warnings?: string[];
}

// P1: Enrichment data from backend (TRS badges, fiche availability, learning status)
interface EnrichmentData {
  [slug: string]: {
    has_fiche: boolean;
    trs?: number | null;
    learning?: boolean;
  };
}

interface ScoreDetails {
  total: number;
  scientific: number;
  personal: number;
}

interface LearningTriggered {
  slug: string;
  name: string;
  status: string;
  topic_id: string;
}

const DEFAULT_GREETING: Message = {
  role: 'assistant',
  content: "Salut ! Je suis BigSis, ta grande soeur en esthetique. Dis-moi ce qui t'amene \u2014 une zone qui te gene, un traitement qui t'intrigue, ou juste une question. On en parle \uD83D\uDCAC",
};

const ZONE_GREETINGS: Record<string, string> = {
  front: "Le front, bonne zone a explorer ! Tes rides bougent quand tu leves les sourcils (expression) ou elles restent marquees meme au repos (statiques) ?",
  glabelle: "La ride du lion, classique ! Elle apparait surtout quand tu fronces les sourcils (expression), ou elle est gravee en permanence (statique) ?",
  pattes_oie: "Les pattes d'oie, j'en parle souvent ! Elles apparaissent quand tu souris (expression) ou elles sont la tout le temps (statiques) ?",
  sillon_nasogenien: "Les sillons nasogeniens, bonne question a creuser ! Ils se marquent surtout quand tu souris (expression) ou ils sont visibles meme au repos (statiques) ?",
};

function getGreeting(zone?: string): Message {
  if (zone && ZONE_GREETINGS[zone]) {
    return { role: 'assistant', content: ZONE_GREETINGS[zone] };
  }
  return DEFAULT_GREETING;
}

const DEFAULT_SUGGESTIONS = [
  "J'ai des rides sur le front",
  "Le Botox, c'est sur ?",
  "Je veux prevenir le vieillissement",
  "Rides autour des yeux",
];

const ZONE_SUGGESTIONS = [
  "Rides d'expression",
  "Rides statiques",
  "Perte de volume",
  "Prevention",
];

const ZONE_LABEL_MAP: Record<string, string> = {
  front: 'zone.forehead',
  glabelle: 'zone.glabella',
  pattes_oie: 'zone.eyes',
  sillon_nasogenien: 'zone.mouth',
};

function parseDiagnosticData(text: string): { cleanText: string; data: DiagnosticData | null } {
  const regex = /\$\$DIAGNOSTIC_JSON\$\$([\s\S]*?)\$\$DIAGNOSTIC_JSON\$\$/;
  const match = text.match(regex);
  if (match) {
    try {
      const data = JSON.parse(match[1].trim());
      const cleanText = text.replace(regex, '').trim();
      return { cleanText, data };
    } catch {
      return { cleanText: text, data: null };
    }
  }
  return { cleanText: text, data: null };
}

// P1: TRS Badge component
function TrsBadge({ trs, hasFiche, learning }: { trs?: number | null; hasFiche: boolean; learning?: boolean }) {
  if (!hasFiche && !trs && !learning) return null;
  return (
    <div className="flex items-center gap-1.5">
      {hasFiche && (
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          <FlaskConical size={10} /> Fiche
        </span>
      )}
      {trs && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
          trs >= 70 ? 'bg-green-500/15 text-green-400 border-green-500/25' :
          trs >= 40 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' :
          'bg-white/5 text-white/40 border-white/10'
        }`}>
          TRS {trs}
        </span>
      )}
      {learning && !hasFiche && (
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse">
          <Brain size={10} /> Apprentissage en cours
        </span>
      )}
    </div>
  );
}

function DiagnosticCard({ data, enrichment, scoreDetails }: { data: DiagnosticData; enrichment: EnrichmentData; scoreDetails?: ScoreDetails | null }) {
  const hasLearning = Object.values(enrichment).some(e => e.learning);
  const sciScore = scoreDetails?.scientific ?? Math.round(data.score_confiance * 0.5);
  const persScore = scoreDetails?.personal ?? Math.round(data.score_confiance * 0.5);

  return (
    <div className="mt-4 space-y-3">
      {/* Split score bars */}
      <div className="glass-panel p-4 rounded-xl space-y-3">
        {/* Scientific score */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-cyan-300/70 uppercase tracking-wider font-medium">Base scientifique</span>
            <span className="text-xs font-bold text-cyan-400">{sciScore}/50</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${(sciScore / 50) * 100}%` }}
            />
          </div>
        </div>
        {/* Personalization score */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-purple-300/70 uppercase tracking-wider font-medium">Personnalisation</span>
            <span className="text-xs font-bold text-purple-400">{persScore}/50</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
              style={{ width: `${(persScore / 50) * 100}%` }}
            />
          </div>
          {persScore < 25 && (
            <p className="text-[10px] text-purple-300/50 mt-1">Donne ton age et type de peau pour affiner</p>
          )}
        </div>
      </div>

      {/* Procedure cards with TRS badges — Fix 1+3: conditional link vs div */}
      {data.options.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-blue-200/60 uppercase tracking-wider font-medium px-1">Options a explorer</span>
          {data.options.map((opt, j) => {
            const slugEnrichment = opt.slug ? enrichment[opt.slug] : undefined;
            const hasFiche = slugEnrichment?.has_fiche ?? false;
            const trs = slugEnrichment?.trs;
            const isLearning = slugEnrichment?.learning && !hasFiche;

            const cardContent = (
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    opt.pertinence === 'haute' ? 'bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]' :
                    opt.pertinence === 'moyenne' ? 'bg-yellow-400' : 'bg-white/30'
                  }`} />
                  <div>
                    <span className="text-sm text-white font-medium">{(opt.slug && slugEnrichment?.name) || opt.name}</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <TrsBadge trs={trs} hasFiche={hasFiche} learning={isLearning} />
                      {!hasFiche && trs && trs >= 40 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                          Fiche bientot
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hasFiche && (
                  <ArrowRight size={14} className="text-white/30 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                )}
              </>
            );

            // Only link if fiche is published
            if (hasFiche && opt.slug) {
              return (
                <div key={j}>
                  <Link
                    href={`/fiches/${opt.slug}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
                  >
                    {cardContent}
                  </Link>
                </div>
              );
            }

            // No fiche: non-clickable card
            return (
              <div key={j} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                {cardContent}
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-learning banner */}
      {hasLearning && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-amber-300">BigSis apprend sur ces sujets</span>
          </div>
          <p className="text-[11px] text-amber-200/60 mt-1 ml-5">
            Je n&#39;ai pas encore de fiche detaillee pour certaines procedures recommandees.
            J&#39;ai lance l&#39;apprentissage automatique — reviens bientot pour une fiche complete !
          </p>
        </div>
      )}

      {/* Safety warnings */}
      {data.safety_warnings && data.safety_warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs font-semibold text-red-300 uppercase">Points de vigilance</span>
          </div>
          {data.safety_warnings.map((w, j) => (
            <p key={j} className="text-xs text-red-200/80 ml-5">{w}</p>
          ))}
        </div>
      )}

      {/* Questions for practitioner */}
      {data.questions_praticien.length > 0 && (
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-xs text-purple-300 uppercase tracking-wider font-medium">A demander a ton praticien</span>
          <ul className="mt-2 space-y-1.5">
            {data.questions_praticien.map((q, j) => (
              <li key={j} className="text-xs text-blue-100/70 flex gap-2">
                <span className="text-purple-400 font-bold">{j + 1}.</span> {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* P1: CTA Journal */}
      <Link
        href="/journal"
        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-sm text-purple-300 font-medium"
      >
        <BookOpen size={14} />
        Tu as fait une procedure ? Suis ta recuperation
      </Link>
    </div>
  );
}

function ChatBubble({ msg, isLast, isStreaming, enrichment, scoreDetails }: { msg: Message; isLast: boolean; isStreaming: boolean; enrichment: EnrichmentData; scoreDetails?: ScoreDetails | null }) {
  return (
    <div>
      <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`
            max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${msg.role === 'user'
              ? 'bg-cyan-500/20 border border-cyan-500/30 text-white rounded-br-md'
              : 'bg-white/5 border border-white/10 text-blue-100/90 rounded-bl-md'
            }
            ${msg.role === 'assistant' && isLast && isStreaming ? 'animate-pulse' : ''}
          `}
        >
          {msg.content || (isStreaming ? '...' : '')}
        </div>
      </div>
      {msg.diagnosticData && <DiagnosticCard data={msg.diagnosticData} enrichment={enrichment} scoreDetails={scoreDetails} />}
    </div>
  );
}

// P2: Feedback component
function FeedbackWidget({ onFeedback, submitted }: { onFeedback: (rating: number) => void; submitted: boolean }) {
  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <Check size={14} /> Merci pour ton retour !
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-blue-200/50">Ce diagnostic t'a aide ?</span>
      <button
        onClick={() => onFeedback(5)}
        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/30 transition-all"
        title="Utile"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => onFeedback(1)}
        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
        title="Pas utile"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

interface ChatDiagnosticProps {
  initialContext?: { area: string };
  onBack?: () => void;
}

export default function ChatDiagnostic({ initialContext, onBack }: ChatDiagnosticProps = {}) {
  const [messages, setMessages] = useState<Message[]>([getGreeting(initialContext?.area)]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [savingDiag, setSavingDiag] = useState(false);
  const [savedDiag, setSavedDiag] = useState(false);
  const [enrichment, setEnrichment] = useState<EnrichmentData>({});
  const [scoreDetails, setScoreDetails] = useState<ScoreDetails | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [savedDiagId, setSavedDiagId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, session } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    // Add empty assistant message for streaming
    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/chat/diagnostic`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          language: 'fr',
          ...(initialContext && { context: initialContext }),
        }),
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.token) {
                  fullText += payload.token;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: fullText };
                    return updated;
                  });
                }
                // P1: Capture enrichment data (TRS badges + learning status)
                if (payload.enrichment) {
                  setEnrichment(payload.enrichment);
                }
                // Capture split score details
                if (payload.score_details) {
                  setScoreDetails(payload.score_details);
                }
                // Auto-learning: log triggered topics (informational)
                if (payload.learning_triggered) {
                  console.log('[BigSis] Auto-learning triggered:', payload.learning_triggered);
                }
                if (payload.done) break;
              } catch { /* skip malformed SSE lines */ }
            }
          }
        }
      }

      // Parse diagnostic data if present in final text
      const { cleanText, data } = parseDiagnosticData(fullText);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: cleanText,
          diagnosticData: data,
        };
        return updated;
      });

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Oops, j'ai eu un souci technique. Tu peux reessayer ?",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const hasDiagnostic = messages.some(m => m.diagnosticData);

  const handleSaveDiagnostic = async () => {
    if (!user || !session) {
      router.push('/auth/login?redirect=/');
      return;
    }

    const diagMsg = messages.find(m => m.diagnosticData);
    if (!diagMsg?.diagnosticData) return;

    setSavingDiag(true);
    try {
      const res = await fetch(`${API_URL}/users/diagnostics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          area: diagMsg.diagnosticData.zone || 'non_specifie',
          wrinkle_type: diagMsg.diagnosticData.concern || null,
          score: diagMsg.diagnosticData.score_confiance || null,
          top_recommendation: diagMsg.diagnosticData.options?.[0]?.name || null,
          chat_messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setSavedDiag(true);
      setSavedDiagId(data.id || null);
    } catch {
      // silently fail
    } finally {
      setSavingDiag(false);
    }
  };

  // P2: Feedback handler
  const handleFeedback = async (rating: number) => {
    if (!session?.access_token || !savedDiagId) {
      // Save first, then submit feedback
      if (!savedDiag) {
        await handleSaveDiagnostic();
      }
    }

    setFeedbackSubmitted(true);

    // Send feedback to backend if we have a diagnostic ID
    if (savedDiagId && session?.access_token) {
      try {
        await fetch(`${API_URL}/users/diagnostics/${savedDiagId}/feedback`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ rating }),
        });
      } catch {
        // silently fail — feedback is best-effort
      }
    }
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px]">
      {/* Zone pill */}
      {initialContext?.area && onBack && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 font-medium">
            {t(ZONE_LABEL_MAP[initialContext.area] || 'zone.forehead')}
          </span>
          <button
            onClick={onBack}
            className="text-xs text-blue-200/40 hover:text-white transition-colors"
          >
            changer
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} isLast={i === messages.length - 1} isStreaming={isStreaming} enrichment={enrichment} scoreDetails={scoreDetails} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (only at start) */}
      {messages.length <= 1 && !isStreaming && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {(initialContext?.area ? ZONE_SUGGESTIONS : DEFAULT_SUGGESTIONS).map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-200/70 hover:bg-white/10 hover:text-white transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input / Actions */}
      <div className="p-4 border-t border-white/10">
        {hasDiagnostic ? (
          <div className="space-y-3">
            {/* P2: Feedback widget */}
            <div className="flex items-center justify-center">
              <FeedbackWidget onFeedback={handleFeedback} submitted={feedbackSubmitted} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onBack) { onBack(); }
                  else { setMessages([DEFAULT_GREETING]); setInput(''); setSavedDiag(false); setSavedDiagId(null); setFeedbackSubmitted(false); setEnrichment({}); setScoreDetails(null); }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-blue-200 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
              >
                <RotateCcw size={14} /> Nouveau diagnostic
              </button>
              <button
                onClick={handleSaveDiagnostic}
                disabled={savingDiag || savedDiag}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  savedDiag
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'
                } disabled:opacity-70`}
              >
                {savedDiag ? <><Check size={14} /> Sauvegarde !</> : savingDiag ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</> : <><Save size={14} /> Sauvegarder</>}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Dis-moi ce qui t'amene..."
              disabled={isStreaming}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-blue-200/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={`
                p-3 rounded-xl transition-all
                ${input.trim() && !isStreaming
                  ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
                }
              `}
            >
              {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
