'use client'

import { useState, useEffect } from 'react'
import { useUser } from './useUser'
import { createClient } from '@/lib/supabase/client'

interface NotificationCounts {
  unreadMessages: number
  pendingInvitations: number
  isLoading: boolean
}

export function useNotifications(): NotificationCounts {
  const { profile } = useUser()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingInvitations, setPendingInvitations] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) {
      setIsLoading(false)
      return
    }

    const fetchNotificationCounts = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // First, get the user's chat IDs
        const { data: userChats, error: chatError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', profile.id)
          .is('left_at', null)

        if (chatError) {
          console.error('Error fetching user chats:', chatError)
          setUnreadMessages(0)
        } else {
          const chatIds = userChats.map(chat => chat.chat_id)
          
          if (chatIds.length > 0) {
            // Get all messages in user's chats (excluding own messages)
            const { data: allMessages, error: messagesError } = await supabase
              .from('messages')
              .select('id')
              .in('chat_id', chatIds)
              .neq('sender_id', profile.id)

            if (messagesError) {
              console.error('Error fetching messages:', messagesError)
              setUnreadMessages(0)
            } else {
              const messageIds = allMessages.map(msg => msg.id)
              
              if (messageIds.length > 0) {
                // Get read message IDs for this user
                const { data: readMessages, error: readError } = await supabase
                  .from('message_read_status')
                  .select('message_id')
                  .eq('user_id', profile.id)
                  .in('message_id', messageIds)

                if (readError) {
                  console.error('Error fetching read status:', readError)
                  setUnreadMessages(0)
                } else {
                  const readMessageIds = new Set(readMessages.map(r => r.message_id))
                  const unreadCount = messageIds.filter(id => !readMessageIds.has(id)).length
                  setUnreadMessages(unreadCount)
                }
              } else {
                setUnreadMessages(0)
              }
            }
          } else {
            setUnreadMessages(0)
          }
        }

        // Fetch pending invitation count
        const { count: invitationCount, error: invitationError } = await supabase
          .from('group_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('invitee_id', profile.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())

        if (invitationError) {
          console.error('Error fetching pending invitations:', invitationError)
          setPendingInvitations(0)
        } else {
          setPendingInvitations(invitationCount || 0)
        }
      } catch (error) {
        console.error('Error fetching notification counts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotificationCounts()

    // Set up real-time subscriptions for updates
    const supabase = createClient()

    // Subscribe to message changes (simplified - will refetch counts on any message change)
    const messageSubscription = supabase
      .channel('message-notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages'
        }, 
        () => {
          fetchNotificationCounts()
        }
      )
      .subscribe()

    // Subscribe to invitation changes
    const invitationSubscription = supabase
      .channel('invitation-notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'group_invitations',
          filter: `invitee_id=eq.${profile.id}`
        }, 
        () => {
          fetchNotificationCounts()
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      messageSubscription.unsubscribe()
      invitationSubscription.unsubscribe()
    }
  }, [profile?.id])

  return {
    unreadMessages,
    pendingInvitations,
    isLoading
  }
} 