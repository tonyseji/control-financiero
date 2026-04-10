import { useState, useRef, useEffect } from 'react'
import { useFinancialAdvisor } from '../hooks/useFinancialAdvisor'
import { useFinancialData } from '../hooks/useFinancialData'
import { classifyQuestion } from '../utils/questionClassifier'
import ChatMessages from './ChatMessages'

export default function ChatPanel({ onClose }) {
  const { messages, loading, error, remainingCalls, sendQuestion } = useFinancialAdvisor()
  const { data, loading: financialDataLoading } = useFinancialData()
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const isUnlimited = remainingCalls === -1

  function handleSend() {
    const q = text.trim()
    if (!q || loading || remainingCalls === 0) return
    const { isPersonal } = classifyQuestion(q)
    // Si es personal pero los datos aún cargan, espera
    if (isPersonal && financialDataLoading) return
    const context = isPersonal && data ? { ...data } : {}
    sendQuestion(q, isPersonal, context)
    setText('')
  }

  function handleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    // Abortar instancia previa si existe
    recognitionRef.current?.abort()

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'es-ES'
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setText(prev => prev ? prev + ' ' + transcript : transcript)
    }

    recognition.start()
  }

  const disabled = (remainingCalls === 0 && !isUnlimited) || loading

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <span className="chat-title">Asesor Financiero</span>
          <span className={`remaining-calls ${remainingCalls === 0 && !isUnlimited ? 'zero' : ''}`}>
            {isUnlimited ? '∞ consultas' : `${remainingCalls}/5 consultas`}
          </span>
        </div>
        <button className="chat-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <div className="chat-disclaimer">
        Orientacion general, no asesoramiento financiero profesional. No tomes decisiones economicas basandote solo en estas respuestas.
      </div>

      <ChatMessages messages={messages} loading={loading} />

      {error && (
        <div className="chat-error">{error}</div>
      )}

      <div className="message-input">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={remainingCalls === 0 && !isUnlimited ? 'Límite diario alcanzado' : 'Pregunta al asesor...'}
          disabled={disabled}
          autoFocus
        />
        <button
          onClick={handleVoice}
          className={`btn-voice ${isListening ? 'listening' : ''}`}
          disabled={disabled}
          aria-label="Voz"
          title="Hablar"
        >
          {isListening ? '⏹' : '🎤'}
        </button>
        <button
          onClick={handleSend}
          className="btn-send"
          disabled={disabled || !text.trim()}
          aria-label="Enviar"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
