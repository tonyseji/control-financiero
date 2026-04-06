import { useState, useRef, useCallback, useEffect } from 'react'
import { parseVoiceText } from '../utils/voiceParser'

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
    : null

/**
 * Validación de input de voz
 * - Duración: 2-30 segundos
 * - Palabras: 2-150
 * - Parsing: debe extraer IMPORTE + descripción clara
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

  // 3. VALIDACIÓN CRÍTICA: debe tener IMPORTE (no solo palabras random)
  const hasAmount = parsedResult?.amount !== null && parsedResult?.amount !== undefined && parsedResult.amount > 0

  if (!hasAmount) {
    return {
      valid: false,
      error: 'No detecté un importe. Intenta: "50 euros en café"',
    }
  }

  return { valid: true }
}

export function useVoiceInput({ categories = [], accounts = [] } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsedFields, setParsedFields] = useState(null)
  const [error, setError] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const recognitionRef = useRef(null)
  const recordingStartRef = useRef(null)
  const recordingTimeIntervalRef = useRef(null)
  const transcriptRef = useRef('')
  const parsedResultRef = useRef(null)
  const categoriesRef = useRef(categories)
  const accountsRef = useRef(accounts)

  useEffect(() => { categoriesRef.current = categories }, [categories])
  useEffect(() => { accountsRef.current = accounts }, [accounts])

  const supported = Boolean(SpeechRecognitionAPI)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
      if (recordingTimeIntervalRef.current) {
        clearInterval(recordingTimeIntervalRef.current)
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    if (isListening) return

    // PASO 1: Pedir permisos explícitamente
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Permisos concedidos, parar el stream
        stream.getTracks().forEach(track => track.stop())

        // PASO 2: Iniciar reconocimiento
        setError(null)
        setTranscript('')
        setParsedFields(null)
        setRecordingTime(0)
        transcriptRef.current = ''
        parsedResultRef.current = null

        if (!recognitionRef.current) {
          recognitionRef.current = new SpeechRecognitionAPI()
          recognitionRef.current.lang = 'es-ES'
          recognitionRef.current.continuous = true
          recognitionRef.current.interimResults = true

          recognitionRef.current.onstart = () => {
            recordingStartRef.current = Date.now()
            setIsListening(true)
            setRecordingTime(0)

            // Mostrar contador de tiempo
            recordingTimeIntervalRef.current = setInterval(() => {
              const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000)
              setRecordingTime(elapsed)

              // Auto-stop a 30 segundos
              if (elapsed >= 30) {
                recognitionRef.current.stop()
              }
            }, 100)
          }

          recognitionRef.current.onresult = (event) => {
            let interimTranscript = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                transcriptRef.current += transcript + ' '
              } else {
                interimTranscript += transcript
              }
            }

            const fullTranscript = transcriptRef.current + interimTranscript
            setTranscript(fullTranscript.trim())
          }

          recognitionRef.current.onend = () => {
            clearInterval(recordingTimeIntervalRef.current)
            setIsListening(false)

            const finalTranscript = transcriptRef.current.trim()
            const audioLengthSeconds = (Date.now() - recordingStartRef.current) / 1000

            // Validar input
            const parsedResult = parseVoiceText(finalTranscript, categoriesRef.current, accountsRef.current)
            const validation = validateVoiceInput(finalTranscript, audioLengthSeconds, parsedResult)

            if (!validation.valid) {
              setError(validation.error)
              setTranscript('')
              setParsedFields(null)
              return
            }

            // Si pasa validación → usa resultado
            setTranscript(finalTranscript)
            setParsedFields(parsedResult)
            setError(null)
          }

          recognitionRef.current.onerror = (event) => {
            clearInterval(recordingTimeIntervalRef.current)
            setIsListening(false)

            let errorMsg = 'Error al capturar voz'
            if (event.error === 'network') {
              errorMsg = 'Error de conexión. Intenta de nuevo.'
            } else if (event.error === 'no-speech') {
              errorMsg = 'No se detectó voz. Intenta de nuevo.'
            }

            setError(errorMsg)
            setParsedFields(null)
          }
        }

        recognitionRef.current.start()
      })
      .catch((err) => {
        // Permisos denegados
        if (err.name === 'NotAllowedError') {
          setError('Permiso de micrófono denegado. Habilítalo en los ajustes del navegador.')
        } else if (err.name === 'NotFoundError') {
          setError('No se detectó micrófono. Verifica tu dispositivo.')
        } else {
          setError('No se puede acceder al micrófono.')
        }
      })
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      clearInterval(recordingTimeIntervalRef.current)
    }
  }, [])

  return {
    isListening,
    transcript,
    parsedFields,
    error,
    recordingTime,
    supported,
    startListening,
    stopListening,
  }
}
