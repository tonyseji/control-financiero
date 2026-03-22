import { supabase, getAuthUserId } from './supabase'

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:cat_parent_id(cat_id, cat_name, cat_color)')
    .eq('cat_is_visible', true)
    .order('cat_type')
    .order('cat_name')
  if (error) throw error
  return data
}

export async function createCategory(category) {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...category, cat_usr_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(catId, changes) {
  const { data, error } = await supabase
    .from('categories')
    .update(changes)
    .eq('cat_id', catId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Categorías sistema no se eliminan — solo se ocultan
export async function hideCategory(catId) {
  return updateCategory(catId, { cat_is_visible: false })
}

export async function deleteCategory(catId) {
  const { error } = await supabase.from('categories').delete().eq('cat_id', catId)
  if (error) throw error
}