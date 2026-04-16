import { supabase } from './supabase'

// ── Google OAuth ─────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

// ── Email + Password ─────────────────────────────────────────────────────────

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin, // enlace de verificación redirige aquí
    },
  })
  if (error) throw error
  // data.user existe pero session es null hasta verificar el email
  return data
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// ── Recuperación de contraseña ────────────────────────────────────────────────

// Paso 1: el usuario pide el email de recuperación
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

// Paso 2: el usuario llega al link del email y escribe la nueva contraseña
// (llamar desde la vista /reset-password, Supabase ya habrá establecido la sesión via el token)
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ── Sesión ───────────────────────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Perfil del usuario (rol incluido) ────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('prof_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(changes) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...changes, prof_updated_at: new Date().toISOString() })
    .eq('prof_id', (await supabase.auth.getUser()).data.user.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Admin: gestión de usuarios ────────────────────────────────────────────────
// Solo accesibles si el usuario tiene rol 'admin' (RLS lo bloquea si no)

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, auth_email:prof_id') // prof_id = auth.users.id, email está en auth.users
    .order('prof_created_at')
  if (error) throw error
  return data
}

export async function setUserRole(userId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ prof_role: role, prof_updated_at: new Date().toISOString() })
    .eq('prof_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setUserActive(userId, isActive) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ prof_is_active: isActive, prof_updated_at: new Date().toISOString() })
    .eq('prof_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
