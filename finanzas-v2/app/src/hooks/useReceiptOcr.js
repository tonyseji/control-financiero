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
 *   // result: { amount, merchant, date, notes, categoryId } | null si hay error
 */
export function useReceiptOcr() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Todos los navegadores móviles modernos soportan input[type=file]
  const supported = true

  /**
   * Procesa un File a través de la Edge Function y devuelve los campos extraídos.
   * @param {File} file — imagen del ticket (jpeg, png, webp, heic)
   * @returns {{ amount, merchant, date, notes, categoryId } | null}
   */
  async function scanFile(file) {
    if (!file) return null

    setError(null)
    setLoading(true)
    try {
      const { base64, mimeType } = await fileToBase64(file)

      // Obtener JWT del usuario autenticado
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) throw new Error('No autenticado')

      // Obtener categorías del localStorage y construir mapa id→nombre
      const categories = JSON.parse(localStorage.getItem('cf_cats') || '[]')
      const categoryMap = {}
      categories.forEach(cat => {
        categoryMap[cat.id] = cat.name
      })

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const apiUrl = `${supabaseUrl}/functions/v1/receipt-ocr`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          categories: categoryMap,
        }),
      })

      const result = await response.json()

      // Manejar error "no es ticket" devuelto por la IA
      if (result.error === 'not_a_receipt') {
        throw { type: 'not_a_receipt', message: 'No parece un ticket válido' }
      }

      if (!response.ok) {
        throw new Error(result.error || 'OCR failed')
      }

      // Validación mínima: al menos el importe debe existir para que sea útil
      if (!result.amount && !result.merchant && !result.date) {
        throw new Error('No se encontraron datos en el ticket. Intenta con una foto más clara.')
      }

      return result  // { amount, merchant, date, notes, categoryId }

    } catch (e) {
      if (e.type === 'not_a_receipt' || e.message === 'not_a_receipt') {
        const err = { type: 'not_a_receipt' }
        setError('Foto no válida. Asegúrate de capturar un ticket o factura.')
        throw err
      }
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
 * También valida que la imagen tenga suficiente densidad de píxeles oscuros
 * para parecer un documento (descarta selfies, fotos de paisajes, etc.).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const img = new Image()
      img.onload = async () => {
        // Validar que parece un documento antes de redimensionar
        const isReceipt = await looksLikeReceipt(img)
        if (!isReceipt) {
          reject(new Error('not_a_receipt'))
          return
        }

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

/**
 * Heurística ligera: si más del 20% de los píxeles son oscuros,
 * la imagen probablemente tiene texto (ticket, factura, documento).
 * Descarta fotos de personas, paisajes, etc. con fondos claros.
 * @param {HTMLImageElement} img — ya cargado
 */
function looksLikeReceipt(img) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    // Usar resolución pequeña para que sea rápido
    const size = 200
    canvas.width  = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)

    const imageData = ctx.getImageData(0, 0, size, size)
    const data = imageData.data

    let darkPixels = 0
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (brightness < 128) darkPixels++
    }

    const textDensity = darkPixels / (size * size)
    resolve(textDensity > 0.2)
  })
}
