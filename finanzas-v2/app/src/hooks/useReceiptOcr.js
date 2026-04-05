import { useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * useReceiptOcr
 *
 * Recibe un File directamente (el input de archivo vive en la vista, no aquí),
 * lo envía a la Edge Function `receipt-ocr` (Claude Vision) y devuelve los
 * datos extraídos del ticket.
 *
 * Uso:
 *   const { scanFile, loading, error, supported } = useReceiptOcr()
 *   const result = await scanFile(file)
 *   // result: { amount, merchant, date, notes } | null si hay error
 */
export function useReceiptOcr() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Todos los navegadores móviles modernos soportan input[type=file]
  const supported = true

  /**
   * Procesa un File a través de la Edge Function y devuelve los campos extraídos.
   * @param {File} file — imagen del ticket (jpeg, png, webp, heic)
   * @returns {{ amount, merchant, date, notes } | null}
   */
  async function scanFile(file) {
    if (!file) return null

    setError(null)
    setLoading(true)
    try {
      const { base64, mimeType } = await fileToBase64(file)

      const { data, error: fnError } = await supabase.functions.invoke('receipt-ocr', {
        body: { imageBase64: base64, mimeType },
      })

      if (fnError) throw new Error(fnError.message ?? 'Error al llamar a la función')

      const result = data

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

  return { scanFile, loading, error, supported }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
