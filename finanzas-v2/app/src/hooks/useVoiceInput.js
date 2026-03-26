import { useState, useRef, useCallback, useEffect } from 'react'
import { parseVoiceText } from '../utils/voiceParser'

// Resolved once at module load — SpeechRecognition never changes after page load
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
    : null

/**
 * Encapsula la Web Speech API para reconocimiento de voz en español.
 * Tras recibir el transcript llama a parseVoiceText y expone los campos parseados.
 *
 * @param {{ categories?: Array, accounts?: Array }} options
 * @returns {{
 *   isListening:   boolean,
 *   transcript:    string,
 *   parsedFields:  object|null,
 *   supported:     boolean,
 *   error:         string|null,
 *   startListening: () => void,
 *   stopListening:  () => void,
 * }}
 */
export function useVoiceInput({ categories = [], accounts = [] } = {}) {
  const [isListening, setIsListening]   = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [parsedFields, setParsedFields] = useState(null)
  const [error, setError]               = useState(null)

  const recognitionRef  = useRef(null)
  // Refs so the onresult closure always reads the latest values without needing
  // categories/accounts in the useCallback dependency array (avoids stale closures
  // when recognition is in progress and parent re-renders with new array references)
  const categoriesRef   = useRef(categories)
  const accountsRef     = useRef(accounts)

  useEffect(() => { categoriesRef.current = categories }, [categories])
  useEffect(() => { accountsRef.current   = accounts   }, [accounts])

  const supported = Boolean(SpeechRecognitionAPI)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    if (isListening) return

    setError(null)
    setTranscript('')
    setParsedFields(null)

    const recognition = new SpeechRecognitionAPI()
    recognition.lang            = 'es-ES'
    recognition.continuous      = false
    recognition.interimResults  = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      const fields = parseVoiceText(text, categoriesRef.current, accountsRef.current)
      setParsedFields(fields)
    }

    recognition.onerror = (event) => {
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          setError('Permiso de micrófono denegado. Actívalo en la configuración del navegador.')
          break
        case 'no-speech':
          setError('No se detectó voz. Inténtalo de nuevo.')
          break
        case 'network':
          setError('Error de red en el reconocimiento de voz.')
          break
        default:
          setError(`Error de voz: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
  }, [])

  return { isListening, transcript, parsedFields, supported, error, startListening, stopListening }
}
