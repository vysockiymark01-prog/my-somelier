import { supabase, type CustomRecipeRow, type PublicCustomRecipeRow } from './supabase'
import type { Ingredient } from '../data/recipes'

function requireClient() {
  if (!supabase) throw new Error('Supabase не настроен')
  return supabase
}

export interface NewCustomRecipeInput {
  ownerId: string
  name: string
  emoji: string
  category: string
  glass: string
  abv: string
  time: string
  ingredients: Ingredient[]
  steps: string[]
  garnish: string
  tip: string
  isPublic: boolean
}

export async function listMyRecipes(ownerId: string): Promise<CustomRecipeRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('custom_recipes')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as CustomRecipeRow[]) ?? []
}

// Рецепты, которыми другие пользователи поделились публично — исключая
// свои собственные (те уже показаны отдельно в «Моих»).
export async function listCommunityRecipes(excludeOwnerId: string): Promise<PublicCustomRecipeRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('custom_recipes')
    .select('*, owner:owner_id(username, display_name)')
    .eq('is_public', true)
    .neq('owner_id', excludeOwnerId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return (data as unknown as PublicCustomRecipeRow[]) ?? []
}

export async function getMyRecipeById(id: string): Promise<CustomRecipeRow | null> {
  const client = requireClient()
  const { data, error } = await client.from('custom_recipes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as CustomRecipeRow) ?? null
}

export async function createCustomRecipe(input: NewCustomRecipeInput) {
  const client = requireClient()
  const { data, error } = await client
    .from('custom_recipes')
    .insert({
      owner_id: input.ownerId,
      name: input.name.trim(),
      emoji: input.emoji.trim() || '🍹',
      category: input.category,
      glass: input.glass.trim(),
      abv: input.abv,
      time: input.time.trim(),
      ingredients: input.ingredients,
      steps: input.steps,
      garnish: input.garnish.trim() || null,
      tip: input.tip.trim() || null,
      is_public: input.isPublic,
    })
    .select()
    .single()
  if (error) throw error
  return data as CustomRecipeRow
}

export async function deleteCustomRecipe(id: string) {
  const client = requireClient()
  const { error } = await client.from('custom_recipes').delete().eq('id', id)
  if (error) throw error
}
