import { createClient } from './client'

// TypeScript interfaces for the messaging system
export interface Chat {
  id: string
  name?: string
  type: 'direct' | 'group'
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string
  is_active: boolean
}

export interface ChatParticipant {
  id: string
  chat_id: string
  user_id: string
  fid?: number
  joined_at: string
  left_at?: string
  is_admin: boolean
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender_fid?: number
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  reply_to?: string
  created_at: string
  updated_at: string
  is_edited: boolean
  is_deleted: boolean
}

// Extended interfaces with joined data
export interface ChatWithParticipants extends Chat {
  participants: ChatParticipant[]
  participant_count: number
  last_message?: Message
}

export interface MessageWithSender extends Message {
  sender?: {
    fid: number
    username: string
    display_name?: string
    pfp_url?: string
  }
}

export interface CreateChatData {
  name?: string
  type: 'direct' | 'group'
  participant_fids: number[] // Farcaster IDs of participants
}

export interface SendMessageData {
  chat_id: string
  content: string
  message_type?: 'text' | 'image' | 'file' | 'system'
  reply_to?: string
}

/**
 * Get all chats for the current user
 */
export async function getUserChats(userFid?: number): Promise<ChatWithParticipants[]> {
  const supabase = createClient()
  
  if (!userFid) {
    throw new Error('User FID is required')
  }

  console.log('Getting chats for user FID:', userFid)

  // Get chats where user is a participant
  const { data: chatIds, error: participantError } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('fid', userFid)
    .is('left_at', null)

  if (participantError) throw new Error(`Participant error: ${participantError.message}`)
  
  console.log('User participates in chats:', chatIds?.map(c => c.chat_id))

  if (!chatIds || chatIds.length === 0) {
    return [] // User has no chats
  }

  // Get full chat data for these chats
  const { data, error } = await supabase
    .from('chats')
    .select(`
      *,
      participants:chat_participants(
        id,
        user_id,
        fid,
        joined_at,
        left_at,
        is_admin
      ),
      last_message:messages(
        id,
        content,
        message_type,
        created_at,
        sender_fid
      )
    `)
    .in('id', chatIds.map(c => c.chat_id))
    .order('last_message_at', { ascending: false })

  if (error) {
    throw new Error(`Chat query error: ${error.message}`)
  }

  return (data || []).map(chat => ({
    ...chat,
    participants: chat.participants?.filter((p: ChatParticipant) => !p.left_at) || [],
    participant_count: chat.participants?.filter((p: ChatParticipant) => !p.left_at)?.length || 0,
    last_message: chat.last_message?.[0] || undefined
  }))
}

/**
 * Get a specific chat by ID with participants and recent messages
 */
export async function getChatById(chatId: string, userFid?: number): Promise<ChatWithParticipants | null> {
  const supabase = createClient()
  
  console.log('Getting chat by ID:', chatId)
  
  if (!userFid) {
    throw new Error('User FID is required')
  }

  console.log('Current user FID:', userFid)

  // First check if the user is a participant in this chat
  const { data: participation, error: participationError } = await supabase
    .from('chat_participants')
    .select('id')
    .eq('chat_id', chatId)
    .eq('fid', userFid)
    .is('left_at', null)
    .single()

  if (participationError && participationError.code !== 'PGRST116') {
    throw new Error(`Participation check error: ${participationError.message}`)
  }

  if (!participation) {
    console.log('User is not a participant in this chat')
    return null // User is not a participant in this chat
  }

  console.log('User is a participant, getting chat data')

  // Now get the full chat data
  const { data, error } = await supabase
    .from('chats')
    .select(`
      *,
      participants:chat_participants(
        id,
        user_id,
        fid,
        joined_at,
        left_at,
        is_admin
      )
    `)
    .eq('id', chatId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('Chat not found')
      return null
    }
    throw new Error(`Chat query error: ${error.message}`)
  }

  // Filter out participants who have left
  const activeParticipants = data.participants?.filter((p: ChatParticipant) => !p.left_at) || []

  console.log('Chat found with', activeParticipants.length, 'active participants')

  return {
    ...data,
    participants: activeParticipants,
    participant_count: activeParticipants.length
  }
}

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(
  chatId: string, 
  limit: number = 50,
  before?: string
): Promise<MessageWithSender[]> {
  const supabase = createClient()
  
  console.log('🔍 getChatMessages called with:', { chatId, limit, before })
  
  // First get messages
  let messagesQuery = supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    messagesQuery = messagesQuery.lt('created_at', before)
  }

  const { data: messages, error: messagesError } = await messagesQuery

  if (messagesError) {
    console.error('❌ Error fetching messages:', messagesError)
    throw messagesError
  }

  if (!messages || messages.length === 0) {
    console.log('✅ No messages found for chat:', chatId)
    return []
  }

  // Get unique sender FIDs
  const senderFids = [...new Set(messages.map(m => m.sender_fid).filter(Boolean))]
  
  // Fetch sender profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('fid, username, display_name, pfp_url')
    .in('fid', senderFids)

  if (profilesError) {
    console.error('❌ Error fetching sender profiles:', profilesError)
    // Continue without sender info rather than failing completely
  }

  // Create a map of FID to profile
  const profileMap = new Map()
  if (profiles) {
    profiles.forEach(profile => {
      profileMap.set(profile.fid, profile)
    })
  }

  // Combine messages with sender info
  const messagesWithSenders: MessageWithSender[] = messages.map(message => ({
    ...message,
    sender: message.sender_fid ? profileMap.get(message.sender_fid) : undefined
  }))

  console.log('✅ Successfully fetched messages with senders:', messagesWithSenders.length, 'messages')
  
  // Reverse to show oldest first
  return messagesWithSenders.reverse()
}

/**
 * Create a new direct chat between two users
 */
export async function createDirectChat(
  currentUserFid: number,
  targetUserFid: number
): Promise<string> {
  const supabase = createClient()
  
  // Get current user profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('fid', currentUserFid)
    .single()

  if (!currentProfile) {
    throw new Error('Current user profile not found')
  }

  // Get target user by FID
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('fid', targetUserFid)
    .single()

  if (!targetProfile) {
    throw new Error('Target user not found')
  }

  // Use the database function to create or get existing direct chat
  const { data, error } = await supabase
    .rpc('create_direct_chat', {
      user1_id: currentProfile.id,
      user1_fid: currentUserFid,
      user2_id: targetProfile.id,
      user2_fid: targetUserFid
    })

  if (error) {
    throw error
  }

  return data
}

/**
 * Create a new group chat
 */
export async function createGroupChat(
  name: string,
  participantFids: number[],
  creatorFid: number
): Promise<string> {
  const supabase = createClient()
  
  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id, fid')
    .eq('fid', creatorFid)
    .single()

  if (!currentProfile) {
    throw new Error('Creator profile not found')
  }

  // Create the group chat
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert({
      name,
      type: 'group',
      created_by: currentProfile.id
    })
    .select()
    .single()

  if (chatError) {
    throw chatError
  }

  // Get all participant profiles
  const allFids = [currentProfile.fid, ...participantFids]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, fid')
    .in('fid', allFids)

  if (!profiles || profiles.length === 0) {
    throw new Error('No valid participants found')
  }

  // Add participants to the chat
  const participants = profiles.map((profile, index) => ({
    chat_id: chat.id,
    user_id: profile.id,
    fid: profile.fid,
    is_admin: profile.fid === currentProfile.fid // Creator is admin
  }))

  const { error: participantsError } = await supabase
    .from('chat_participants')
    .insert(participants)

  if (participantsError) {
    throw participantsError
  }

  return chat.id
}

/**
 * Send a message to a chat
 */
export async function sendMessage(messageData: SendMessageData, senderFid?: number): Promise<Message> {
  const supabase = createClient()
  
  if (!senderFid) {
    throw new Error('Sender FID is required')
  }

  // Get sender's profile to get the user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('fid', senderFid)
    .single()

  if (!profile) {
    throw new Error('Sender profile not found')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: messageData.chat_id,
      sender_id: profile.id,
      sender_fid: senderFid,
      content: messageData.content,
      message_type: messageData.message_type || 'text',
      reply_to: messageData.reply_to
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Add a participant to a group chat
 */
export async function addChatParticipant(
  chatId: string,
  userFid: number
): Promise<void> {
  const supabase = createClient()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('fid', userFid)
    .single()

  if (!profile) {
    throw new Error('User not found')
  }

  const { error } = await supabase
    .from('chat_participants')
    .insert({
      chat_id: chatId,
      user_id: profile.id,
      fid: userFid
    })

  if (error) {
    throw error
  }
}

/**
 * Leave a chat (set left_at timestamp)
 */
export async function leaveChat(chatId: string, userFid: number): Promise<void> {
  const supabase = createClient()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('fid', userFid)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  const { error } = await supabase
    .from('chat_participants')
    .update({ left_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('user_id', profile.id)

  if (error) {
    throw error
  }
}

/**
 * Subscribe to new messages in a chat (for real-time updates)
 */
export function subscribeToChatMessages(
  chatId: string,
  onMessage: (message: Message) => void
) {
  const supabase = createClient()
  
  return supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        onMessage(payload.new as Message)
      }
    )
    .subscribe()
}

/**
 * Get chat participants with their profile information
 */
export async function getChatParticipants(chatId: string): Promise<Array<ChatParticipant & { profile?: any }>> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('chat_participants')
    .select(`
      *,
      profile:profiles!chat_participants_fid_fkey(
        fid,
        username,
        display_name,
        pfp_url
      )
    `)
    .eq('chat_id', chatId)
    .is('left_at', null)

  if (error) {
    throw error
  }

  return data || []
} 