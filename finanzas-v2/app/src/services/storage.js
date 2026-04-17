import { supabase } from './supabase'

const BUCKET = 'receipts'

// Valida que una URL sea un path de Supabase Storage del propio proyecto.
// Evita que un usuario inserte URLs externas arbitrarias en tx_attachment_url
// o prof_avatar_url (vector de pixel tracking / XSS via img src).
export function isValidStorageUrl(url) {
  if (!url) return true // null/undefined es válido (campo opcional)
  try {
    const { origin } = new URL(import.meta.env.VITE_SUPABASE_URL)
    const parsed = new URL(url)
    return parsed.origin === origin && parsed.pathname.startsWith('/storage/v1/object/')
  } catch {
    return false
  }
}

// Sube un archivo de ticket (foto) al bucket 'receipts'.
// Path: {userId}/{timestamp}-{filename} — aislado por usuario.
export async function uploadReceipt(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
  if (signError) throw signError
  return data.signedUrl
}

// Elimina un archivo de Storage dado su URL (firmada o pública).
// Solo elimina si la URL pertenece al bucket propio del usuario.
export async function deleteReceipt(url) {
  if (!isValidStorageUrl(url)) throw new Error('URL de adjunto no válida')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Extrae el path relativo desde la URL, soportando ambos formatos:
  //   /storage/v1/object/sign/receipts/{userId}/{file}?token=...   (signed)
  //   /storage/v1/object/public/receipts/{userId}/{file}           (public — legacy)
  const urlObj = new URL(url)
  const pathname = urlObj.pathname

  let relativePath = null
  const signedPrefix = `/storage/v1/object/sign/${BUCKET}/`
  const publicPrefix = `/storage/v1/object/public/${BUCKET}/`

  if (pathname.startsWith(signedPrefix)) {
    relativePath = pathname.slice(signedPrefix.length)
  } else if (pathname.startsWith(publicPrefix)) {
    relativePath = pathname.slice(publicPrefix.length)
  }

  if (!relativePath) throw new Error('No se pudo extraer el path del archivo')

  // Verifica que el path pertenece al usuario actual
  if (!relativePath.startsWith(user.id + '/')) {
    throw new Error('No tienes permiso para eliminar este archivo')
  }

  const { error } = await supabase.storage.from(BUCKET).remove([relativePath])
  if (error) throw error
}
