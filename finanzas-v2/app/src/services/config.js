import { supabase } from './supabase'

export async function getConfig() {
  const { data, error } = await supabase
    .from('financial_config')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data // null si el usuario aún no ha configurado objetivos
}

export async function upsertConfig(config) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('financial_config')
    .upsert({ ...config, fcfg_usr_id: user.id }, { onConflict: 'fcfg_usr_id' })
    .select()
    .single()
  if (error) throw error
  return data
}