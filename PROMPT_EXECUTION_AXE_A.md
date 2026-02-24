# PROMPT D'EXECUTION — Axe A : Diagnostic Conversationnel (Chat AI)

Tu es un developpeur fullstack senior. Tu travailles sur le monorepo BigSis (`bigsis-app/` = Next.js 15 App Router, `bigsis-brain/` = FastAPI Python). Tu dois executer chaque step ci-dessous dans l'ordre, verifier que ca compile/fonctionne, puis passer au suivant. Ne saute aucune step. Ne propose pas — execute.

---

## POURQUOI CE CHANGEMENT

Le wizard actuel (3 boutons radio → submit → page resultat) est un pattern mort. En 2026, personne ne remplit un formulaire pour obtenir un diagnostic. Le standard = **conversation naturelle avec une IA**, comme Perplexity ou ChatGPT.

BigSis est une "grande soeur". On lui PARLE. Elle repond en streaming, pose des questions de suivi, puis synthetise un diagnostic. Pas de formulaire. Pas de page de resultat separee. Tout se passe dans le chat.

---

## CONTEXTE TECHNIQUE (lire ces fichiers AVANT de coder)

| Fichier | Role | Notes |
|---|---|---|
| `bigsis-app/src/components/WizardForm.tsx` | ACTUEL wizard 3 steps | A REMPLACER par ChatDiagnostic |
| `bigsis-app/src/views/HomePage.tsx` | Affiche WizardForm dans un glass-panel | Modifier pour afficher ChatDiagnostic |
| `bigsis-app/src/views/ResultPage.tsx` | Page resultat apres wizard | GARDER pour l'instant (backward compat liens partages) |
| `bigsis-app/src/api.ts` | Client API (analyzeWrinkles, etc.) | Ajouter `streamDiagnostic()` |
| `bigsis-brain/api/endpoints.py` | Endpoints FastAPI | Ajouter `/chat/diagnostic` SSE |
| `bigsis-brain/core/orchestrator.py` | Pipeline Rules → RAG → LLM | Ajouter methode `stream_diagnostic()` |
| `bigsis-brain/core/llm_client.py` | Client OpenAI (GPT-4o) | Ajouter methode `stream_response()` |
| `bigsis-brain/core/rules/engine.py` | 40+ regles cliniques YAML | Deja fonctionnel, appeler avec le contexte extrait du chat |
| `bigsis-brain/api/schemas.py` | Schemas Pydantic | Ajouter `ChatMessage`, `DiagnosticRequest` |

### Style du codebase

- Dark theme : `bg-[#0B1221]`, `glass-panel`, `text-cyan-400`, `border-white/10`
- Animations : `animate-in fade-in`, transitions 300ms
- Imports : `next/link`, `next/navigation` (PAS react-router-dom)
- Composants client : `'use client'` en premiere ligne
- Paths : `@/*` → `./src/*`
- SSR-safe : `sessionStorage` dans `useEffect` uniquement

---

## STEP 1 — Backend : Ajouter le streaming LLM

**Fichier : `bigsis-brain/core/llm_client.py`**

Lis le fichier actuel. Il a une methode `generate_response()` qui retourne un dict. Ajoute une methode `stream_response()` qui yield les tokens un par un.

```python
async def stream_response(
    self,
    system_prompt: str,
    user_content: str,
    model_override: str = None,
    temperature_override: float = None
):
    """Yield tokens one by one for SSE streaming."""
    if self._is_mock:
        # Mock streaming for dev without API key
        mock_text = "Je suis BigSis en mode demo. Connectez une cle API OpenAI pour des reponses reelles."
        for word in mock_text.split():
            yield word + " "
        return

    target_model = model_override or self.model
    target_temp = temperature_override if temperature_override is not None else 0.4

    try:
        stream = await self.client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=target_temp,
            stream=True
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    except Exception as e:
        logger.error(f"Stream LLM failed: {e}")
        yield f"Desole, une erreur est survenue. Reessaie dans quelques instants."
```

**Ne PAS modifier** la methode `generate_response()` existante — elle est utilisee pour les fiches.

**Verification step 1 :** `python3 -c "from core.llm_client import LLMClient; print('OK')"` dans le dossier `bigsis-brain/`.

---

## STEP 2 — Backend : Schema + Endpoint SSE `/chat/diagnostic`

### 2a. Ajouter les schemas

**Fichier : `bigsis-brain/api/schemas.py`**

Ajouter apres les classes existantes :

```python
class ChatMessage(BaseModel):
    role: str  # "user" ou "assistant"
    content: str

class DiagnosticRequest(BaseModel):
    messages: List[ChatMessage]
    language: str = "fr"
```

### 2b. Creer le endpoint SSE

**Fichier : `bigsis-brain/api/endpoints.py`**

Ajouter ces imports en haut :

```python
from fastapi.responses import StreamingResponse
from api.schemas import ChatMessage, DiagnosticRequest
import asyncio
```

Ajouter cet endpoint :

```python
@router.post("/chat/diagnostic")
async def chat_diagnostic(request: DiagnosticRequest):
    """
    Chat-based diagnostic with SSE streaming.
    BigSis analyses the conversation, extracts clinical context,
    runs rules engine + RAG, then streams a response.
    """
    messages = request.messages
    language = request.language

    async def event_stream():
        try:
            # 1. Extract clinical context from conversation
            context = _extract_context_from_messages(messages)

            # 2. Run rules engine if enough context
            rules_text = ""
            if context.get("area") or context.get("concern"):
                from core.rules.engine import RulesEngine
                engine = RulesEngine()
                rules_context = {}
                if context.get("area"):
                    rules_context["area"] = context["area"]
                if context.get("wrinkle_type"):
                    rules_context["wrinkle_type"] = context["wrinkle_type"]
                if context.get("pregnancy"):
                    rules_context["pregnancy"] = True
                if context.get("age"):
                    rules_context["age"] = context["age"]

                rule_outputs = engine.evaluate(rules_context)
                if rule_outputs:
                    rules_text = "\n=== REGLES CLINIQUES ===\n"
                    for r in rule_outputs:
                        rules_text += f"- [{r.type.upper()}] {r.detail}\n"

            # 3. RAG retrieval if topic identified
            evidence_text = ""
            if context.get("concern") or context.get("area"):
                from core.rag.retriever import retrieve_evidence
                query = f"{context.get('concern', '')} {context.get('area', '')} aesthetic procedure"
                chunks = await retrieve_evidence(query, limit=3)
                if chunks:
                    evidence_text = "\n=== PREUVES SCIENTIFIQUES ===\n"
                    for c in chunks:
                        evidence_text += f"Source: {c['source']}\n{c['text'][:300]}\n---\n"

            # 4. Build system prompt
            system_prompt = _build_chat_system_prompt(language, context)

            # 5. Build user content (full conversation + enrichments)
            conversation_text = "\n".join([
                f"{'Utilisatrice' if m.role == 'user' else 'BigSis'}: {m.content}"
                for m in messages
            ])

            enriched_prompt = f"""Historique de conversation :
{conversation_text}

{rules_text}
{evidence_text}

Reponds au dernier message de l'utilisatrice. Sois concise (2-4 phrases max sauf si c'est la synthese finale).
Si tu as assez d'infos (zone + preoccupation + contexte), genere la synthese diagnostique finale avec le format indique.
Si tu n'as PAS assez d'infos, pose UNE question naturelle de suivi."""

            # 6. Stream response
            llm = orchestrator.llm_client
            async for token in llm.stream_response(
                system_prompt=system_prompt,
                user_content=enriched_prompt,
                model_override="gpt-4o-mini"
            ):
                # SSE format
                yield f"data: {json.dumps({'token': token})}\n\n"

            # End signal
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.error(f"Chat diagnostic error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


def _extract_context_from_messages(messages: list) -> dict:
    """
    Parse the conversation to extract structured clinical context.
    This is a keyword-based extraction — not LLM-dependent.
    """
    context = {}
    full_text = " ".join([m.content.lower() for m in messages if m.role == "user"])

    # Zone detection
    zone_keywords = {
        "front": ["front", "forehead", "rides du front"],
        "glabelle": ["glabelle", "ride du lion", "rides du lion", "entre les sourcils", "frown"],
        "pattes_oie": ["pattes d'oie", "pattes doie", "yeux", "contour des yeux", "crow", "rides des yeux"],
        "sillon_nasogenien": ["sillon", "nasogenien", "bouche", "levres", "nasolabial", "sourire"],
        "cou": ["cou", "neck", "decollete"],
        "joues": ["joue", "joues", "cheek"],
    }
    for zone, keywords in zone_keywords.items():
        if any(kw in full_text for kw in keywords):
            context["area"] = zone
            break

    # Wrinkle type detection
    if any(w in full_text for w in ["expression", "ride d'expression", "quand je souris", "quand je fronce"]):
        context["wrinkle_type"] = "expression"
    elif any(w in full_text for w in ["statique", "permanente", "toujours visible", "repos", "meme au repos"]):
        context["wrinkle_type"] = "statique"

    # Concern / topic detection
    concern_keywords = {
        "botox": ["botox", "toxine botulique", "botulique"],
        "acide hyaluronique": ["acide hyaluronique", "filler", "injection", "volume"],
        "peeling": ["peeling", "peel"],
        "laser": ["laser", "lumiere pulsee", "ipl"],
        "rides": ["ride", "rides", "ridule", "vieillissement"],
        "prevention": ["prevenir", "prevention", "preventif", "commencer tot"],
        "skinbooster": ["skinbooster", "skin booster", "hydratation profonde"],
        "microneedling": ["microneedling", "micro-needling", "dermaroller"],
    }
    for concern, keywords in concern_keywords.items():
        if any(kw in full_text for kw in keywords):
            context["concern"] = concern
            break

    # If no specific concern found, use the last user message as general concern
    if "concern" not in context:
        user_messages = [m.content for m in messages if m.role == "user"]
        if user_messages:
            context["concern"] = user_messages[-1][:100]

    # Pregnancy detection
    if any(w in full_text for w in ["enceinte", "grossesse", "allaite", "allaitement", "pregnant", "breastfeed"]):
        context["pregnancy"] = True

    # Age detection
    import re
    age_match = re.search(r'\b(\d{2})\s*ans\b', full_text)
    if age_match:
        context["age"] = int(age_match.group(1))

    # Budget detection
    budget_match = re.search(r'(\d+)\s*(?:€|euro|eur)', full_text)
    if budget_match:
        context["budget"] = int(budget_match.group(1))

    # Previous treatments detection
    if any(w in full_text for w in ["deja fait", "deja eu", "deja essaye", "precedent traitement", "il y a"]):
        context["previous_treatment"] = True

    return context


def _build_chat_system_prompt(language: str, context: dict) -> str:
    """Build the BigSis chat system prompt based on extracted context."""

    # Determine conversation stage
    has_zone = "area" in context
    has_concern = "concern" in context
    has_enough = has_zone and has_concern

    base_prompt = """Tu es BigSis, la grande soeur bienveillante et experte en esthetique medicale.

PERSONNALITE :
- Ton direct, chaleureux, sans bullshit. Tu parles comme une grande soeur, pas comme un medecin.
- Tu utilises "tu" (pas "vous"). Tu es proche, pas distante.
- Tu ne diagnostiques PAS et tu ne prescris PAS. Tu informes et tu guides.
- Tu cites tes sources quand tu as des donnees scientifiques.
- Si tu n'as pas assez d'infos, tu le dis clairement.

REGLES DE CONVERSATION :
1. Reponds en 2-4 phrases MAX (sauf synthese finale).
2. Pose UNE seule question de suivi a la fois.
3. Ne fais PAS de listes a puces dans les messages de conversation — c'est un chat, pas un rapport.
4. Utilise des emojis avec parcimonie (1-2 max par message).
5. Si l'utilisatrice mentionne grossesse/allaitement, traite ca comme priorite absolue (contre-indication possible).
"""

    if has_enough:
        base_prompt += """
INSTRUCTIONS SYNTHESE FINALE :
Tu as assez d'infos pour generer la synthese. Structure ta reponse ainsi :

1. D'abord un paragraphe de synthese personnalisee (ton grande soeur, 3-5 phrases)
2. Puis un bloc JSON sur une seule ligne entre les marqueurs $$DIAGNOSTIC_JSON$$ :

$$DIAGNOSTIC_JSON$$
{"score_confiance": 72, "zone": "...", "concern": "...", "options": [{"name": "...", "pertinence": "haute/moyenne/basse", "slug": "..."}], "risques": ["..."], "questions_praticien": ["..."], "safety_warnings": ["..."]}
$$DIAGNOSTIC_JSON$$

Le JSON sert au frontend pour afficher les cartes de procedures et le score. Le texte avant est ce que l'utilisatrice lira.
Les slugs doivent correspondre aux fiches existantes (ex: "botox", "acide-hyaluronique", "peeling-chimique").
"""
    else:
        missing = []
        if not has_zone:
            missing.append("la zone du visage concernee")
        if not has_concern:
            missing.append("sa preoccupation principale")
        base_prompt += f"""
ETAPE ACTUELLE : Tu n'as pas encore toutes les infos. Il te manque : {', '.join(missing)}.
Pose une question naturelle pour obtenir cette info. PAS de formulaire, PAS de liste de choix.
Exemples de bonnes questions :
- "C'est ou exactement que ca te gene ? Front, yeux, autour de la bouche ?"
- "Et tu cherches plutot a prevenir ou a corriger quelque chose de visible ?"
- "Tu as un traitement en tete ou tu pars de zero ?"
"""

    return base_prompt
```

**Important :** Ajouter `import json` et `import logging` en haut du fichier s'ils ne sont pas deja importes. Egalement `logger = logging.getLogger(__name__)` si absent.

**Verification step 2 :** `python3 -c "from api.endpoints import router; print('OK')"` dans `bigsis-brain/`.

---

## STEP 3 — Frontend : Creer le composant ChatDiagnostic

**Fichier a creer : `bigsis-app/src/components/ChatDiagnostic.tsx`**

C'est un composant `'use client'` qui remplace le WizardForm. Voici l'architecture :

```tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Send, Loader2, ArrowRight, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';
import { API_URL } from '../api';

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

const GREETING_MESSAGE: Message = {
  role: 'assistant',
  content: "Salut ! Je suis BigSis, ta grande soeur en esthetique. Dis-moi ce qui t'amene — une zone qui te gene, un traitement qui t'intrigue, ou juste une question. On en parle 💬",
};

const SUGGESTIONS = [
  "J'ai des rides sur le front",
  "Le Botox, c'est sur ?",
  "Je veux prevenir le vieillissement",
  "Rides autour des yeux",
];

export default function ChatDiagnostic() {
  const [messages, setMessages] = useState<Message[]>([GREETING_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const parseDiagnosticData = (text: string): { cleanText: string; data: DiagnosticData | null } => {
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
  };

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
      const response = await fetch(`${API_URL}/chat/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          language: 'fr',
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
                if (payload.done) break;
                if (payload.error) {
                  fullText += '\n\nDesole, une erreur est survenue.';
                }
              } catch { /* skip malformed lines */ }
            }
          }
        }
      }

      // Parse diagnostic data if present
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
          content: "Oops, j'ai eu un souci technique. Tu peux reessayer ? 🙏",
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

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  const handleReset = () => {
    setMessages([GREETING_MESSAGE]);
    setInput('');
  };

  // Check if diagnostic has been generated
  const hasDiagnostic = messages.some(m => m.diagnosticData);

  return (
    <div className="flex flex-col h-[500px] md:h-[600px]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg, i) => (
          <div key={i}>
            {/* Message bubble */}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`
                  max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-cyan-500/20 border border-cyan-500/30 text-white rounded-br-md'
                    : 'bg-white/5 border border-white/10 text-blue-100/90 rounded-bl-md'
                  }
                  ${msg.role === 'assistant' && i === messages.length - 1 && isStreaming
                    ? 'animate-pulse'
                    : ''
                  }
                `}
              >
                {msg.content || (isStreaming ? '...' : '')}
              </div>
            </div>

            {/* Diagnostic Card (inline after the assistant message) */}
            {msg.diagnosticData && (
              <div className="mt-4 space-y-3">
                {/* Score bar */}
                <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-200/60 uppercase tracking-wider font-medium">Niveau de confiance</span>
                    <span className="text-sm font-bold text-cyan-400">{msg.diagnosticData.score_confiance}/100</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${msg.diagnosticData.score_confiance}%` }}
                    />
                  </div>
                </div>

                {/* Procedure cards */}
                {msg.diagnosticData.options.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-blue-200/60 uppercase tracking-wider font-medium px-1">Options a explorer</span>
                    {msg.diagnosticData.options.map((opt, j) => (
                      <Link
                        key={j}
                        href={opt.slug ? `/fiches/${opt.slug}` : '/fiches'}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            opt.pertinence === 'haute' ? 'bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]' :
                            opt.pertinence === 'moyenne' ? 'bg-yellow-400' : 'bg-white/30'
                          }`} />
                          <span className="text-sm text-white font-medium">{opt.name}</span>
                        </div>
                        <ArrowRight size={14} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Safety warnings */}
                {msg.diagnosticData.safety_warnings && msg.diagnosticData.safety_warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span className="text-xs font-semibold text-red-300 uppercase">Points de vigilance</span>
                    </div>
                    {msg.diagnosticData.safety_warnings.map((w, j) => (
                      <p key={j} className="text-xs text-red-200/80 ml-5">{w}</p>
                    ))}
                  </div>
                )}

                {/* Questions for practitioner */}
                {msg.diagnosticData.questions_praticien.length > 0 && (
                  <div className="glass-panel p-4 rounded-xl">
                    <span className="text-xs text-purple-300 uppercase tracking-wider font-medium">A demander a ton praticien</span>
                    <ul className="mt-2 space-y-1.5">
                      {msg.diagnosticData.questions_praticien.map((q, j) => (
                        <li key={j} className="text-xs text-blue-100/70 flex gap-2">
                          <span className="text-purple-400 font-bold">{j + 1}.</span> {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (only show at start) */}
      {messages.length <= 1 && !isStreaming && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-200/70 hover:bg-white/10 hover:text-white transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        {hasDiagnostic ? (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-blue-200 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
            >
              <RotateCcw size={14} /> Nouveau diagnostic
            </button>
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
```

**Verification step 3 :** `npm run build` dans `bigsis-app/`. Pas d'erreur TS.

---

## STEP 4 — Brancher ChatDiagnostic dans la HomePage

**Fichier : `bigsis-app/src/views/HomePage.tsx`**

Remplacer l'import de WizardForm par ChatDiagnostic :

```tsx
// AVANT
import WizardForm from '../components/WizardForm';

// APRES
import ChatDiagnostic from '../components/ChatDiagnostic';
```

Remplacer l'utilisation dans le JSX :

```tsx
// AVANT
<div className="flex-1 w-full max-w-md">
    <div className="glass-panel p-1 rounded-2xl">
        <WizardForm />
    </div>
</div>

// APRES
<div className="flex-1 w-full max-w-lg">
    <div className="glass-panel p-1 rounded-2xl">
        <ChatDiagnostic />
    </div>
</div>
```

Note : `max-w-md` → `max-w-lg` pour donner plus d'espace au chat.

**NE PAS supprimer WizardForm.tsx** pour l'instant — il reste comme fallback.

**Verification step 4 :** `npm run build` passe. La page d'accueil affiche le chat.

---

## STEP 5 — CORS : Autoriser le streaming SSE

**Fichier : `bigsis-brain/main.py`**

Verifier que le middleware CORS autorise les requetes streaming. Si `CORSMiddleware` est deja configure, verifier que `allow_headers=["*"]` est present. Le SSE a besoin que le header `Content-Type: text/event-stream` ne soit pas bloque.

Lis `main.py` et verifie. Si le CORS est deja permissif (`allow_origins=["*"]`), rien a changer. Sinon, ajouter les origines du frontend (`http://localhost:3000`, `https://bigsis.app`, etc.).

**Verification step 5 :** Pas de blocage CORS dans la console navigateur.

---

## STEP 6 — Verification finale

Executer dans cet ordre :

```bash
# Backend
cd bigsis-brain && python3 -c "from api.endpoints import router; from api.social import router as sr; print('OK')"

# Frontend
cd ../bigsis-app && npm run build
```

Les deux doivent passer sans erreur.

### Test fonctionnel (manuel)

1. Ouvrir `http://localhost:3000`
2. Le chat BigSis s'affiche avec le message de bienvenue et les suggestions
3. Cliquer sur "J'ai des rides sur le front" ou taper un message
4. La reponse arrive en streaming (token par token)
5. BigSis pose une question de suivi
6. Apres 2-3 echanges, elle genere la synthese avec les cartes de procedures cliquables
7. Cliquer sur une procedure → navigation vers `/fiches/botox` (ou autre)
8. Le bouton "Nouveau diagnostic" reset le chat

---

## FICHIERS A MODIFIER (RESUME)

| Fichier | Action |
|---|---|
| `bigsis-brain/core/llm_client.py` | +methode `stream_response()` (async generator) |
| `bigsis-brain/api/schemas.py` | +classes `ChatMessage`, `DiagnosticRequest` |
| `bigsis-brain/api/endpoints.py` | +endpoint `/chat/diagnostic` avec SSE + helpers `_extract_context_from_messages()`, `_build_chat_system_prompt()` |
| `bigsis-app/src/components/ChatDiagnostic.tsx` | NOUVEAU — composant chat complet |
| `bigsis-app/src/views/HomePage.tsx` | Remplacer WizardForm par ChatDiagnostic |

---

## REGLES STRICTES

1. NE PAS supprimer WizardForm.tsx ni ResultPage.tsx — ils restent pour backward compat
2. NE PAS ajouter de nouvelles dependances npm (fetch + EventSource sont natifs)
3. NE PAS utiliser de librairie de chat (pas de chatscope, pas de stream-chat) — tout en composants maison
4. Le streaming utilise fetch + ReadableStream (PAS EventSource, car on POST)
5. Chaque step doit compiler avant de passer au suivant
6. Utiliser les patterns visuels EXISTANTS (glass-panel, bg-[#0B1221], text-cyan-400)
7. `'use client'` en premiere ligne de ChatDiagnostic.tsx
8. Imports : `next/link` pour Link, `next/navigation` pour useRouter
9. JAMAIS react-router-dom
10. Le composant ChatDiagnostic doit faire MOINS de 300 lignes — si c'est plus, extraire des sous-composants
11. Le backend ne doit PAS stocker les conversations en DB pour l'instant (stateless)
12. Le system prompt BigSis doit TOUJOURS vouvoyer en "tu", pas en "vous"

---

## ARCHITECTURE DU FLOW

```
Utilisatrice tape un message
    │
    ▼
[ChatDiagnostic.tsx]
    │ POST /api/v1/chat/diagnostic { messages, language }
    ▼
[endpoints.py: chat_diagnostic()]
    │
    ├─ _extract_context_from_messages() → { area, concern, age, pregnancy, ... }
    │
    ├─ RulesEngine.evaluate(context) → warnings/contraindications
    │
    ├─ retrieve_evidence(query) → RAG chunks
    │
    ├─ _build_chat_system_prompt() → adapte selon les infos manquantes
    │
    ▼
[LLMClient.stream_response()] → SSE tokens
    │
    ▼
[ChatDiagnostic.tsx] affiche token par token
    │
    ├─ Si message contient $$DIAGNOSTIC_JSON$$ → parse + affiche cartes
    │
    └─ Sinon → continue la conversation
```

---

## CE QUE CA CHANGE POUR L'UTILISATRICE

**AVANT (wizard):**
1. Clique "Front" → Next
2. Clique "Expression" → Next
3. Coche "Grossesse" → Analyser
4. Attend 5 secondes (spinner)
5. Redirigee vers /result avec du texte generique
6. Aucun lien vers les fiches

**APRES (chat):**
1. Voit le message de BigSis : "Salut ! Dis-moi ce qui t'amene"
2. Tape "J'ai des rides sur le front et je me demande si le Botox c'est safe"
3. BigSis repond en streaming : "Ok, c'est super courant ! Tu as quel age ? Et c'est des rides qui apparaissent quand tu fronces ou elles sont la tout le temps ?"
4. Echange 1-2 messages de plus
5. BigSis genere la synthese DANS le chat : score, options cliquables, alertes, questions pour le praticien
6. Clic sur "Botox" → fiche verite complete
7. Bouton "Nouveau diagnostic" pour recommencer
