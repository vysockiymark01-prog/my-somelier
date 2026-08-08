import {
  supabase,
  type Profile,
  type FriendshipRow,
  type PartyRow,
  type PartyGuestRow,
  type PartyMenuVoteRow,
} from './supabase'

export interface FriendshipWithProfile extends FriendshipRow {
  requester: Profile
  addressee: Profile
}

export interface PartyWithGuests extends PartyRow {
  host: Profile
  guests: (PartyGuestRow & { guest: Profile })[]
}

function requireClient() {
  if (!supabase) throw new Error('Supabase не настроен')
  return supabase
}

export async function searchProfiles(query: string, excludeId: string): Promise<Profile[]> {
  const client = requireClient()
  if (!query.trim()) return []
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .ilike('username', `%${query.trim().toLowerCase()}%`)
    .neq('id', excludeId)
    .limit(20)
  if (error) throw error
  return (data as Profile[]) ?? []
}

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  const client = requireClient()
  const { error } = await client.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  })
  if (error) throw error
}

export async function respondFriendRequest(id: string, status: 'accepted' | 'declined') {
  const client = requireClient()
  const { error } = await client.from('friendships').update({ status }).eq('id', id)
  if (error) throw error
}

export async function removeFriendship(id: string) {
  const client = requireClient()
  const { error } = await client.from('friendships').delete().eq('id', id)
  if (error) throw error
}

export async function listFriendships(userId: string): Promise<FriendshipWithProfile[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('friendships')
    .select('*, requester:requester_id(*), addressee:addressee_id(*)')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as FriendshipWithProfile[]) ?? []
}

export async function createParty(input: {
  hostId: string
  title: string
  description: string
  location: string
  startsAt: string
}) {
  const client = requireClient()
  const { data, error } = await client
    .from('parties')
    .insert({
      host_id: input.hostId,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      starts_at: input.startsAt,
    })
    .select()
    .single()
  if (error) throw error
  return data as PartyRow
}

export async function listParties(userId: string): Promise<PartyWithGuests[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('parties')
    .select('*, host:host_id(*), guests:party_guests(*, guest:guest_id(*))')
    .order('starts_at', { ascending: true })
  if (error) throw error
  const all = (data as unknown as PartyWithGuests[]) ?? []
  // RLS уже ограничивает видимые строки хостом/приглашёнными, но на
  // всякий случай подстрахуемся и на клиенте.
  return all.filter(
    (p) => p.host_id === userId || p.guests.some((g) => g.guest_id === userId)
  )
}

export async function inviteToParty(partyId: string, guestId: string) {
  const client = requireClient()
  const { error } = await client.from('party_guests').insert({
    party_id: partyId,
    guest_id: guestId,
    status: 'invited',
  })
  if (error) throw error
}

export async function respondPartyInvite(
  id: string,
  status: 'going' | 'maybe' | 'declined'
) {
  const client = requireClient()
  const { error } = await client.from('party_guests').update({ status }).eq('id', id)
  if (error) throw error
}

export async function listPartyVotes(partyId: string): Promise<PartyMenuVoteRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('party_menu_votes')
    .select('*')
    .eq('party_id', partyId)
  if (error) throw error
  return (data as PartyMenuVoteRow[]) ?? []
}

export async function voteForRecipe(partyId: string, voterId: string, recipeId: string) {
  const client = requireClient()
  const { error } = await client.from('party_menu_votes').insert({
    party_id: partyId,
    voter_id: voterId,
    recipe_id: recipeId,
  })
  if (error) throw error
}

export async function unvoteForRecipe(partyId: string, voterId: string, recipeId: string) {
  const client = requireClient()
  const { error } = await client
    .from('party_menu_votes')
    .delete()
    .eq('party_id', partyId)
    .eq('voter_id', voterId)
    .eq('recipe_id', recipeId)
  if (error) throw error
}
