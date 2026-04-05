import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'

/**
 * useReceiptOcr
 *
 * Gestiona la captura de imagen (cámara o galería) y la llamada a la
 * Edge Function `receipt-ocr`, que usa Claude Vision para extraer los
 * datos del ticket.
 *
 * Uso:
 *   const { scan, loading, error, supported } = useReceiptOcr()
 *   const result = await scan()
 *   // result: { amount, merchant, date, notes } | null si el usuario cancela
 */
export function useReceiptOcr() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const inputRef              = useRef(null)

  // Todos los navegadores móviles modernos soportan input[type=file] con capture
  const supported = true

  /**
   * Abre la cámara/galería, sube la imagen a la EF y devuelve los campos extraídos.
   * Retorna null si el usuario cancela sin seleccionar imagen.
   */
  async function scan() {
    setError(null)

    // Crear un input file temporal si no existe
    if (!inputRef.current) {
      const input = document.createElement('input')
      input.type    = 'file'
      input.accept  = 'image/jpeg,image/png,image/webp,image/heic'
      // En móvil abre la cámara directamente; en desktop abre el explorador de archivos
      input.capture = 'environment'
      inputRef.current = input
    }

    const file = await pickFile(inputRef.current)
    if (!file) return null  // usuario canceló

    setLoading(true)
    try {
      const { base64, mimeType } = await fileToBase64(file)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No hay sesión activa')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/receipt-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }

      const result = await res.json()

      // Validación mínima: al menos el importe debe existir para que sea útil
      if (!result.amount && !result.merchant && !result.date) {
        throw new Error('No se encontraron datos en el ticket. Intenta con una foto más clara.')
      }

      return result  // { amount, merchant, date, notes }

    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { scan, loading, error, supported }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Abre el selector de archivo y espera a que el usuario elija uno.
 * Resuelve con el File seleccionado, o null si cancela.
 */
function pickFile(input) {
  return new Promise(resolve => {
    // Limpiar valor para que el evento change dispare aunque se elija la misma imagen
    input.value = ''

    const onChange = (e) => {
      input.removeEventListener('change', onChange)
      resolve(e.target.files?.[0] ?? null)
    }
    // Si el usuario cierra el diálogo sin elegir, el focus vuelve a la ventana
    const onFocus = () => {
      window.removeEventListener('focus', onFocus)
      // Pequeño delay para que el evento change (si ocurre) tenga prioridad
      setTimeout(() => {
        input.removeEventListener('change', onChange)
        resolve(null)
      }, 400)
    }

    input.addEventListener('change', onChange)
    window.addEventListener('focus', onFocus, { once: true })
    input.click()
  })
}

/**
 * Convierte un File a { base64: string, mimeType: string }.
 * La imagen se redimensiona a máx 1200px antes de codificarla para
 * reducir el tamaño del payload sin perder legibilidad del ticket.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else                { width  = Math.round(width * MAX / height); height = MAX }
        }

        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        // Usar jpeg para reducir tamaño; calidad 0.85 suficiente para OCR
        const dataUrl  = canvas.toDataURL('image/jpeg', 0.85)
        const base64   = dataUrl.split(',')[1]
        resolve({ base64, mimeType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
