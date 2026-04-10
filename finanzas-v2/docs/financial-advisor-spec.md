# Especificación Técnica — Asesor Financiero IA

**Status:** Diseño v1 (pre-implementación)
**Fecha:** 2026-04-07
**Decisiones de UX basadas en:** Tony (chat flotante, texto+voz, 5 preguntas/día, contexto variado)

---

## 1. Visión General

El **Asesor Financiero IA** es un chat conversacional híbrido que:
- **Responde a preguntas personalizadas** (datos del usuario: gastos, balance, ahorro)
- **Responde a preguntas generales** (conocimiento financiero base: cómo ahorrar, estrategias de inversión)
- **Provee consejos contextuales** (detecta gastos inusuales, ofrece insights)
- **Es accesible vía chat flotante + voz opcional**
- **Está limitado a 5 preguntas/día para gestionar costos**

---

## 2. Arquitectura

### 2.1 Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                       │
│  FloatingChat (bubble) → ChatPanel → MessageInput (text+voice)  │
│  - Almacena historial en localStorage (último 10 msgs)          │
│  - Detecta si pregunta es personal o general                    │
│  - Llama a Edge Function con JWT + pregunta + contexto resumido │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /financial-advisor
                             │ JWT + pregunta + contexto
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION — financial-advisor                  │
│  1. Valida JWT y obtiene user_id                               │
│  2. Verifica rate limit (5/día en Supabase tabla)              │
│  3. Si personalizada: resume datos (top 5 categorías, balance)  │
│  4. Construye prompt (datos + pregunta)                         │
│  5. Llama Claude API (claude-haiku-4-5-20251001)               │
│  6. Incrementa contador de llamadas                             │
│  7. Devuelve respuesta + contador actualizado                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Claude API
                             │ (ANTHROPIC_API_KEY en Secrets)
                             ↓
                     [Respuesta a usuario]
```

### 2.2 Tabla de Rate Limiting

Nueva tabla Supabase:

```sql
CREATE TABLE advisor_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  call_date DATE DEFAULT CURRENT_DATE,
  call_count INT DEFAULT 1,
  UNIQUE(user_id, call_date)
);

CREATE INDEX idx_advisor_calls_user_date
  ON advisor_calls(user_id, call_date);
```

**RLS Policy:** User puede ver su propio contador.

---

## 3. Flujo de Datos

### 3.1 Flujo típico (pregunta personalizada)

```
Usuario escribe: "¿Cuál fue mi peor gasto en marzo?"

1. Frontend detecta:
   - Contexto: "marzo", "peor gasto" → PERSONALIZADA
   - Historial previo: ["¿Cuánto ahorré?" (respuesta anterior)]

2. Frontend resume contexto:
   {
     question: "¿Cuál fue mi peor gasto en marzo?",
     isPersonal: true,
     context: {
       month: "2026-03",
       topCategories: [
         { name: "Comida", total: 450, percentage: 30 },
         { name: "Transporte", total: 300, percentage: 20 },
         { name: "Ocio", total: 225, percentage: 15 }
       ],
       monthlyIncome: 2100,
       monthlyExpense: 1500,
       savingsRate: 28.6,
       previousQuestions: ["¿Cuánto ahorré?"]
     }
   }

3. Frontend llama Edge Function:
   POST /financial-advisor
   Headers: Authorization: Bearer <JWT>
   Body: { question, isPersonal, context }

4. Edge Function:
   a. Valida JWT → obtiene user_id
   b. SELECT call_count FROM advisor_calls WHERE user_id=X, call_date=TODAY
   c. Si call_count >= 5 → devuelve { error: "Límite diario alcanzado" }
   d. Resume datos desde BD (simplificado ya que frontend hizo el trabajo)
   e. Construye prompt:
      ```
      Eres un asesor financiero personal amigable y directo.
      El usuario tiene estas métricas (mes actual: marzo 2026):
      - Comida: €450 (30% del gasto)
      - Transporte: €300 (20%)
      - Ocio: €225 (15%)
      - Ingresos: €2,100
      - Gastos: €1,500
      - Tasa ahorro: 28.6%

      Contexto previo: ha preguntado sobre ahorros antes.

      Pregunta: "¿Cuál fue mi peor gasto en marzo?"

      Responde de forma concisa (2-3 líneas), amigable y actionable.
      ```
   f. Llama Claude con prompt + isPersonal=true
   g. Incrementa contador: UPDATE advisor_calls SET call_count = call_count + 1
   h. Devuelve { response, remainingCalls: 4 }

5. Frontend recibe respuesta:
   "Tu peor gasto en marzo fue Comida (€450). Eso es 3€ más caro que tu promedio.
   Idea: preparar 1-2 comidas en casa/semana podrías ahorrar ~€60. 💡"

   Muestra: "Consultas restantes: 4/5" + botón micrófono + input

6. Almacena en localStorage:
   {
     role: "user",
     content: "¿Cuál fue mi peor gasto en marzo?"
   },
   {
     role: "assistant",
     content: "Tu peor gasto...",
     timestamp: "2026-04-07T14:32:00Z"
   }
```

### 3.2 Flujo de pregunta general

```
Usuario escribe: "¿Cuánto necesito ahorrar para un piso en Madrid?"

1. Frontend detecta:
   - Contexto: "piso", "ahorrar", "Madrid" → GENERAL
   - No necesita datos personales

2. Frontend llama con isPersonal=false:
   POST /financial-advisor
   { question, isPersonal: false, context: {} }

3. Edge Function:
   a. Valida JWT
   b. Verifica rate limit (igual, cuenta para ambos tipos)
   c. Construye prompt (sin datos personales):
      ```
      Eres un asesor financiero amigable.

      Pregunta: "¿Cuánto necesito ahorrar para un piso en Madrid?"

      Responde de forma concisa, considerando que:
      - Precios vivienda Madrid: ~€350k-500k rango medio
      - Entrada típica: 20% = ~€70k-100k
      - Plazo típico: 5-10 años

      Sé práctico, menciona opciones (renta, compra, ahorros alternativos).
      ```
   d. Llama Claude
   e. Devuelve respuesta

4. Ejemplo respuesta:
   "Para un piso en Madrid (€400k) necesitas ~€80k entrada (20%).
   Si ahorras €500/mes, tardarías 13 años. Si €1k/mes, 7 años.

   Opción: empieza con depósito pequeño, refinancia después. O alquila 5 años
   mientras ahorras, el precio puede subir pero tú habrás acumulado más. 🏠"
```

### 3.3 Flujo de consejo contextual (futuro)

```
Usuario añade transacción:
- Tipo: Gasto
- Cantidad: €180
- Categoría: Ocio
- Promedio mes actual en Ocio: €45

Frontend detecta anomalía (4x el promedio) → suggestion chip:
"💬 El asesor tiene un comentario sobre este gasto"
Click → abre chat con pregunta pre-generada:

"He notado que este gasto de €180 en Ocio es mucho más alto que tu promedio
(€45/mes). ¿Hay algún contexto?"

Edge Function devuelve:
"Veo que es 4x tu promedio. Si es una actividad especial (viaje, evento),
no te preocupes. Si es recurrente, podrías ajustarlo a €60/mes y ahorrar €1.08k/año. 💡"
```

---

## 4. Componentes React

### 4.1 `FloatingChat.jsx` (bubble flotante)

```jsx
// Ubicación: app/src/components/FloatingChat.jsx
// Props: none (conecta directamente a services)
// Estado local: isOpen, messages, loading, error, remainingCalls

export default function FloatingChat() {
  // Renderiza bubble circular (bottom-right)
  // Click abre/cierra panel
  // Badge rojo si remainingCalls === 0

  return (
    <div className="floating-chat">
      {isOpen ? <ChatPanel /> : <ChatBubble />}
    </div>
  );
}
```

**Estilos CSS:**
```css
.floating-chat {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  font-family: var(--font-family);
}

.chat-bubble {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.chat-bubble:hover {
  transform: scale(1.05);
}

.chat-bubble.badge-zero {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-panel {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 360px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 4.2 `ChatPanel.jsx`

```jsx
// Contenedor principal del chat
// Muestra:
//   - Contador de llamadas (top)
//   - Historial de mensajes (scrollable)
//   - Input + botón voz (bottom)

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingCalls, setRemainingCalls] = useState(5);

  return (
    <div className="chat-panel">
      <ChatHeader remainingCalls={remainingCalls} />
      <ChatMessages messages={messages} loading={loading} />
      <MessageInput
        onSend={handleSend}
        onVoice={handleVoice}
        disabled={remainingCalls === 0 || loading}
      />
    </div>
  );
}
```

### 4.3 `MessageInput.jsx`

```jsx
// Input text + botón voz
// Comportamiento:
//   - Enter → envía
//   - Mic click → abre Web Speech API
//   - Si remainingCalls === 0 → todo deshabilitado

export default function MessageInput({ onSend, onVoice, disabled }) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleVoiceClick = async () => {
    // Reutilizar lógica de Web Speech API de AddTransaction.jsx
    // Convertir voz → texto → populateText
  };

  return (
    <div className="message-input">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Pregunta al asesor..."
        disabled={disabled}
      />
      <button
        onClick={handleVoiceClick}
        className="btn-voice"
        disabled={disabled}
      >
        🎤
      </button>
      <button
        onClick={() => handleSend(text)}
        className="btn-send"
        disabled={disabled || !text.trim()}
      >
        ↑
      </button>
    </div>
  );
}
```

### 4.4 `ChatMessages.jsx`

```jsx
// Renderiza historial
// User messages: alineadas derecha, fondo azul
// Assistant messages: alineadas izquierda, fondo gris
// Loading: animación de "typing..."

export default function ChatMessages({ messages, loading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          {msg.content}
        </div>
      ))}
      {loading && <div className="message typing">Asesor escribiendo...</div>}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

---

## 5. Edge Function — `financial-advisor`

### 5.1 Estructura base

```typescript
// supabase/functions/financial-advisor/index.ts

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // 1. Extraer JWT del header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401 }
      );
    }

    // 2. Validar JWT y obtener user_id
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const userId = data.user.id;

    // 3. Parsear body
    const body = await req.json();
    const { question, isPersonal, context } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Missing question' }),
        { status: 400 }
      );
    }

    // 4. Verificar rate limit (5 llamadas/día)
    const today = new Date().toISOString().split('T')[0];
    let callRecord = await supabase
      .from('advisor_calls')
      .select('call_count')
      .eq('user_id', userId)
      .eq('call_date', today)
      .single();

    if (!callRecord.error && callRecord.data?.call_count >= 5) {
      return new Response(
        JSON.stringify({
          error: 'Daily limit exceeded',
          remainingCalls: 0,
          message: 'Has alcanzado el límite de 5 consultas diarias. Vuelve mañana.'
        }),
        { status: 429 }
      );
    }

    // 5. Construir prompt
    let systemPrompt = `Eres un asesor financiero personal, amigable y directo.
Responde de forma concisa (2-3 líneas máximo), accionable y con tono conversacional.
Usa emojis ocasionalmente. Idioma: español.`;

    let userPrompt = question;

    if (isPersonal && context) {
      // Agregar datos resumidos al prompt
      const { topCategories, monthlyIncome, monthlyExpense, savingsRate } = context;

      systemPrompt += `\n\nDatos del usuario (mes actual):
${topCategories?.map(c => `- ${c.name}: €${c.total} (${c.percentage}%)`).join('\n')}
Ingresos: €${monthlyIncome}
Gastos: €${monthlyExpense}
Tasa ahorro: ${savingsRate}%`;
    }

    // 6. Llamar Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const assistantMessage = response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'No pude procesar tu pregunta.';

    // 7. Incrementar contador
    if (!callRecord.error && callRecord.data) {
      // Actualizar
      await supabase
        .from('advisor_calls')
        .update({ call_count: callRecord.data.call_count + 1 })
        .eq('user_id', userId)
        .eq('call_date', today);
    } else {
      // Insertar primer registro del día
      await supabase
        .from('advisor_calls')
        .insert([{ user_id: userId, call_date: today, call_count: 1 }]);
    }

    // 8. Devolver respuesta
    return new Response(
      JSON.stringify({
        response: assistantMessage,
        remainingCalls: 4, // O el valor correcto tras actualizar
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
});
```

---

## 6. Hook React — `useFinancialAdvisor.js`

```javascript
// app/src/hooks/useFinancialAdvisor.js

import { useState, useCallback } from 'react';
import { getAdvisorResponse } from '../services/advisor';

export function useFinancialAdvisor() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remainingCalls, setRemainingCalls] = useState(5);

  const sendQuestion = useCallback(async (question, isPersonal = true, context = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdvisorResponse(question, isPersonal, context);

      if (result.error) {
        setError(result.message || result.error);
        setRemainingCalls(0);
        return;
      }

      // Agregar mensaje del usuario
      setMessages(prev => [...prev, {
        role: 'user',
        content: question,
        timestamp: new Date()
      }]);

      // Agregar respuesta del asesor
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      }]);

      setRemainingCalls(result.remainingCalls);
    } catch (err) {
      setError(err.message || 'Error al conectar con el asesor');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    remainingCalls,
    sendQuestion
  };
}
```

---

## 7. Service — `advisor.js`

```javascript
// app/src/services/advisor.js

import { supabase } from './supabase';

export async function getAdvisorResponse(question, isPersonal = true, context = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No authenticated');
    }

    const response = await fetch(
      import.meta.env.VITE_SUPABASE_URL + '/functions/v1/financial-advisor',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          isPersonal,
          context,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || 'Unknown error',
        message: data.message || 'Error al conectar con el asesor',
        remainingCalls: data.remainingCalls || 0,
      };
    }

    return {
      response: data.response,
      remainingCalls: data.remainingCalls,
    };
  } catch (error) {
    return {
      error: error.message,
      remainingCalls: 0,
    };
  }
}
```

---

## 8. Detección de tipo de pregunta

```javascript
// app/src/utils/questionClassifier.js

const PERSONAL_KEYWORDS = [
  'mi', 'mío', 'yo', 'mía',
  'gasto', 'ingreso', 'balance', 'ahorro', 'cuenta',
  'marzo', 'febrero', 'mes', 'semana',
  'peor', 'mejor', 'más', 'menos',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  '2026', '2025'
];

const GENERAL_KEYWORDS = [
  'cómo', 'qué', 'cuándo', 'dónde',
  'investir', 'ahorrar', 'pagar', 'hipoteca',
  'casa', 'piso', 'coche', 'viaje',
  'tarjeta', 'crédito', 'deuda', 'impuesto',
  'fondo', 'bolsa', 'acciones', 'crypto'
];

export function classifyQuestion(question) {
  const lower = question.toLowerCase();

  const personalScore = PERSONAL_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const generalScore = GENERAL_KEYWORDS.filter(kw => lower.includes(kw)).length;

  // Si tiene palabras personales y las menciona primero
  if (personalScore > 0 && personalScore >= generalScore) {
    return { isPersonal: true, confidence: personalScore / PERSONAL_KEYWORDS.length };
  }

  return { isPersonal: false, confidence: generalScore / GENERAL_KEYWORDS.length };
}
```

---

## 9. Ejemplos de Interacción

### Ejemplo 1: Pregunta personal + sugerencia de acción

```
Usuario: "¿Cuál fue mi peor gasto de marzo?"

Asesor: "Tu peor gasto fue Comida (€450, 30% del total).
Idea rápida: si preparas 2 comidas/semana en casa en vez de fuera, ahorras ~€60.
Doable? 🎯"

Contador: "4/5 consultas restantes"
```

### Ejemplo 2: Pregunta general

```
Usuario: "¿Cuánto necesito ahorrar para una casa?"

Asesor: "Depende de dónde y el precio, pero regla simple:
Entrada típica = 20% del precio. Si buscas piso a €400k, necesitas €80k.
Ahorrando €800/mes = 10 años. ¿Tienes un objetivo de precio? 🏠"

Contador: "3/5 consultas restantes"
```

### Ejemplo 3: Pregunta personalizada + general

```
Usuario: "Con mi tasa de ahorro actual, ¿cuándo puedo comprar piso?"

Asesor: "[Contexto: usuario ahorra 28.6% = €428/mes en marzo]
Con tu tasa actual (€428/mes), para un piso a €400k (entrada €80k),
tardarias 186 meses = 15,5 años. Pero si aumentas ahorro a 35%... 8 años. 💡
¿Quieres explorar opciones de financiación?"

Contador: "2/5 consultas restantes"
```

### Ejemplo 4: Límite alcanzado

```
Usuario: Intenta enviar pregunta (sin llamadas restantes)

UI: Badge rojo "0/5", input deshabilitado
Mensaje: "Has alcanzado el límite de 5 consultas hoy.
Vuelve mañana a las 00:00 UTC para más preguntas."
```

---

## 10. Rate Limiting — Detalles de implementación

### 10.1 Tabla Supabase (migration nueva)

```sql
-- supabase/migrations/002_advisor_calls.sql

CREATE TABLE public.advisor_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INT NOT NULL DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: un registro por usuario/día
  UNIQUE(user_id, call_date)
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_advisor_calls_user_date
  ON public.advisor_calls(user_id, call_date);

-- RLS: cada usuario ve su propio contador
ALTER TABLE public.advisor_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call counts"
  ON public.advisor_calls
  FOR SELECT
  USING (auth.uid() = user_id);

-- El Edge Function con SERVICE_ROLE actualiza automáticamente
-- (no necesita policy de INSERT/UPDATE porque es SECURITY DEFINER)
```

### 10.2 Actualización de contador en Edge Function

```typescript
// Pseudocódigo en financial-advisor/index.ts

const today = new Date().toISOString().split('T')[0];

// Intentar actualizar si existe registro de hoy
const { data: existing } = await supabase
  .from('advisor_calls')
  .select('call_count')
  .eq('user_id', userId)
  .eq('call_date', today)
  .maybeSingle();

if (existing) {
  if (existing.call_count >= 5) {
    return error('Limit exceeded', 429);
  }

  // Actualizar (incrementar contador)
  await supabase
    .from('advisor_calls')
    .update({
      call_count: existing.call_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('call_date', today);

  const remainingCalls = 5 - (existing.call_count + 1);
  // ... devolver response con remainingCalls
} else {
  // Insertar primer registro del día
  await supabase
    .from('advisor_calls')
    .insert([{
      user_id: userId,
      call_date: today,
      call_count: 1
    }]);

  const remainingCalls = 4; // 5 - 1
  // ... devolver response con remainingCalls
}
```

---

## 11. Integración en UI

### 11.1 Ubicación en App.jsx

```jsx
// app/src/App.jsx

import FloatingChat from './components/FloatingChat';

export default function App() {
  return (
    <>
      <Layout>
        {/* Routes, vistas, etc. */}
      </Layout>

      {/* Chat flotante siempre disponible (excepto en login) */}
      {isAuthenticated && <FloatingChat />}
    </>
  );
}
```

### 11.2 CSS principales

```css
/* app/src/styles/main.css */

/* Floating chat bubble */
.floating-chat {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-bubble {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: all 0.2s ease;
  user-select: none;
}

.chat-bubble:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.chat-bubble.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-panel {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 360px;
  max-height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  font-family: var(--font-family);
}

@media (max-width: 480px) {
  .chat-panel {
    width: calc(100vw - 40px);
    bottom: 20px;
    right: 20px;
  }
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remaining-calls {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.remaining-calls.zero {
  color: #ef4444;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  padding: 10px 12px;
  border-radius: 8px;
  max-width: 85%;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.4;
}

.message.user {
  align-self: flex-end;
  background: #3b82f6;
  color: white;
  border-bottom-right-radius: 2px;
}

.message.assistant {
  align-self: flex-start;
  background: #f1f5f9;
  color: #1e293b;
  border-bottom-left-radius: 2px;
}

.message.typing {
  font-style: italic;
  color: #94a3b8;
}

.message-input {
  padding: 12px;
  border-top: 1px solid var(--border-soft);
  display: flex;
  gap: 8px;
}

.message-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.message-input button {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: #f1f5f9;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.message-input button:hover:not(:disabled) {
  background: #e2e8f0;
}

.message-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-send {
  background: #3b82f6 !important;
  color: white;
}

.btn-send:hover:not(:disabled) {
  background: #2563eb !important;
}
```

---

## 12. Próximos pasos de implementación

1. **Crear tabla `advisor_calls` en Supabase**
   - Migración SQL: `supabase/migrations/002_advisor_calls.sql`
   - RLS policies
   - Índice para performance

2. **Edge Function `financial-advisor`**
   - Crear en `supabase/functions/financial-advisor/index.ts`
   - Desplegar: `supabase functions deploy financial-advisor`
   - Añadir `ANTHROPIC_API_KEY` a Supabase Secrets

3. **Componentes React**
   - `FloatingChat.jsx`
   - `ChatPanel.jsx`
   - `ChatMessages.jsx`
   - `MessageInput.jsx`

4. **Servicios y Hooks**
   - `services/advisor.js`
   - `hooks/useFinancialAdvisor.js`
   - `utils/questionClassifier.js`

5. **Integración en App.jsx**
   - Importar `FloatingChat`
   - Renderizar siempre (si autenticado)

6. **Testing**
   - Prueba manual: preguntas personalizadas
   - Prueba manual: preguntas generales
   - Prueba rate limit: 6ª pregunta debe fallar
   - Prueba voz (opcional en v1.0)

---

## 13. Consideraciones de UX

- **Primera consulta gratis:** El día que se registra el usuario, puede hacer 5 consultas inmediatamente.
- **Contador visual claro:** "4/5 consultas" es más amigable que porcentaje o mensaje genérico.
- **Mensajes de error específicos:**
  - Si JWT inválido: "Parece que tu sesión expiró. Recarga la app."
  - Si límite alcanzado: "Has alcanzado 5 preguntas hoy. Vuelve a las 00:00 UTC."
  - Si error de Claude: "El asesor está pensando... intenta de nuevo en un momento."
- **Histórico limitado:** Guardar últimas 10 preguntas en localStorage para rapidez, no toda la BD.
- **Sin almacenamiento en BD de preguntas/respuestas (v1.0):** Solo el contador de llamadas. Si en el futuro necesitamos auditoria, creamos tabla separada.

---

## 14. Seguridad

- ✅ JWT validado en Edge Function (solo usuarios autenticados)
- ✅ Rate limiting server-side (no confiamos en el cliente)
- ✅ ANTHROPIC_API_KEY en Supabase Secrets (nunca en frontend)
- ✅ Contexto resumido antes de enviar a Claude (no enviamos array completo de transacciones)
- ✅ No almacenamos datos sensibles en localStorage más allá de historial chat
- ⚠️ Edge Function debe tener "Verify JWT with legacy secret" desactivado (lección aprendida de receipt-ocr)

---

## 15. Preguntas abiertas / Decisiones futuras

1. **Almacenamiento persistente de chat?**
   → v1.0: localStorage solo. v2.0: crear tabla `advisor_chat_history` si se necesita persistencia multi-dispositivo.

2. **Premium/pago?**
   → v1.0: 5/día para todos. v2.0: usuarios premium con límite mayor (20/día) integrado con Stripe.

3. **Consejos contextuales (gasto grande)?**
   → v1.0: no. v2.0: cuando agregues una transacción > 3x el promedio, mostrar sugerencia "¿Quieres que el asesor lo analice?"

4. **Múltiples idiomas?**
   → v1.0: solo español. v2.0: añadir languagePreference del usuario al contexto.

5. **Histórico por conversación?**
   → v1.0: un histórico lineal. v2.0: múltiples "threads" (ej: "Mis gastos de marzo", "Opciones de inversión").

---

**Versión:** v1.0 (pre-dev)
**Autor:** Tony + Claude
**Última actualización:** 2026-04-07
