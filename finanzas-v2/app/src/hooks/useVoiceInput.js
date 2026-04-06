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
function validateVoiceInput(transcript, audioLengthSeconds, parsedResult) {
  const AUDIO_MAX = 30
  const AUDIO_MIN = 2
  const MAX_WORDS = 150
  const MIN_WORDS = 2

  // 1. Duración
  if (audioLengthSeconds < AUDIO_MIN) {
    return { valid: false, error: 'Muy corto. Intenta de nuevo.' }
  }
  if (audioLengthSeconds > AUDIO_MAX) {
    return { valid: false, error: `Demasiado largo. Máximo ${AUDIO_MAX}s.` }
  }

  // 2. Número de palabras
  const words = transcript.split(/\s+/).filter(w => w.length > 0)
  if (words.length < MIN_WORDS) {
    return { valid: false, error: 'Muy corto. Más palabras, por favor.' }
  }
  if (words.length > MAX_WORDS) {
    return { valid: false, error: `Muy largo. Máximo ${MAX_WORDS} palabras.` }
  }

  // 3. Validar que se extrajo algo del parsing
  const hasAmount     = parsedResult?.amount !== null && parsedResult?.amount !== undefined
  const hasTxType     = parsedResult?.txType !== null && parsedResult?.txType !== undefined
  const hasCategoryId = parsedResult?.categoryId !== null && parsedResult?.categoryId !== undefined

  if (!hasAmount && !hasTxType && !hasCategoryId) {
    return {
      valid: false,
      error: 'No entendí. Intenta: "50 euros en café" o "ingreso 2500"',
    }
  }

  return { valid: true }
}

export function useVoiceInput({ categories = [], accounts = [] } = {}) {
  const [isListening, setIsListening]   = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [parsedFields, setParsedFields] = useState(null)
  const [error, setError]               = useState(null)

  const recognitionRef      = useRef(null)
  const recordingStartRef   = useRef(null)   // timestamp al iniciar grabación
  const transcriptRef       = useRef('')      // transcript capturado en onresult
  const parsedResultRef     = useRef(null)    // resultado parseado en onresult
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

    recognition.onstart = () => {
      recordingStartRef.current = Date.now()
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      transcriptRef.current = text
      // Parsear pero no aplicar todavía — onend valida primero
      parsedResultRef.current = parseVoiceText(text, categoriesRef.current, accountsRef.current)
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

      const transcript   = transcriptRef.current
      const parsedResult = parsedResultRef.current
      const audioLengthSeconds = recordingStartRef.current
        ? (Date.now() - recordingStartRef.current) / 1000
        : 0

      // Solo validar si hay algo que validar (onresult puede no haberse disparado)
      if (!transcript && !parsedResult) return

      const validation = validateVoiceInput(transcript, audioLengthSeconds, parsedResult)
      if (!validation.valid) {
        setError(validation.error)
        setParsedFields(null)
        return
      }

      setParsedFields(parsedResult)
      setError(null)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
  }, [])

  return { isListening, transcript, parsedFields, supported, error, startListening, stopListening }
}
