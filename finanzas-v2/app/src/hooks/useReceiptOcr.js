import { useState } from 'react'
import { supabase } from '../services/supabase'

/**
 * Valida que una imagen parece un ticket (tiene suficiente texto/contraste)
 */
function looksLikeReceipt(img) {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let darkPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
        if (brightness < 128) darkPixels++
      }

      const textDensity = darkPixels / (canvas.width * canvas.height)
      // Si >15% píxeles oscuros = parece documento con texto
      resolve(textDensity > 0.15)
    } catch (err) {
      resolve(false)
    }
  })
}

/**
 * Convierte archivo a base64 y lo comprime
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

        // Redimensionar a máximo 1200px
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round(height * MAX / width)
            width = MAX
          } else {
            width = Math.round(width * MAX / height)
            height = MAX
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        // Convertir a JPEG con calidad 0.85
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        const base64 = dataUrl.split(',')[1]
        const mimeType = 'image/jpeg'

        resolve({ base64, mimeType })
      }
      img.onerror = () => reject(new Error('Invalid image'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsDataURL(file)
  })
}

export function useReceiptOcr() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Escanea un archivo de imagen y extrae datos del ticket via Edge Function.
   * @param {File} file - Imagen del ticket
   * @param {Array} categories - Array de categorías del usuario (de useCategories)
   * @returns {Promise<Object|null>} { amount, merchant, date, notes, categoryId } o null si hay error
   */
  async function scanFile(file, categories = []) {
    if (!file) return null

    setError(null)
    setLoading(true)

    try {
      // 1. Convertir a base64 y validar que es un documento
      const { base64, mimeType } = await fileToBase64(file)

      // 2. Obtener JWT del usuario autenticado
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) throw new Error('No autenticado')

      // 3. Construir mapa de categorías desde el parámetro (V2 — Supabase)
      // Incluimos cat_type para que Claude pueda inferir el subtipo (gasto fijo/variable/ahorro...)
      const categoryMap = {}
      categories.forEach(cat => {
        categoryMap[cat.cat_id] = { name: cat.cat_name, type: cat.cat_type }
      })

      // 4. Enviar a Edge Function
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

      // 5. Manejar error "no es ticket" devuelto por Claude
      if (result.error === 'not_a_receipt') {
        const notReceiptError = new Error('No parece un ticket válido')
        notReceiptError.type = 'not_a_receipt'
        throw notReceiptError
      }

      if (!response.ok) {
        throw new Error(result.error || 'Error procesando imagen')
      }

      // 6. Validación: al menos un campo importante debe existir
      if (!result.amount && !result.merchant && !result.date) {
        throw new Error('No se encontraron datos en el ticket. Intenta con una foto más clara.')
      }

      setLoading(false)
      return result // { amount, merchant, date, notes, categoryId }

    } catch (err) {
      const errorMsg = err.type === 'not_a_receipt'
        ? 'No parece un ticket válido'
        : err.message || 'Error al procesar la imagen'

      setError(errorMsg)
      setLoading(false)
      throw err
    }
  }

  return { scanFile, loading, error }
}
