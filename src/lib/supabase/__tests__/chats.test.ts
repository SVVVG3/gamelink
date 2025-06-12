// Test file for chat functionality
// Run these tests after applying the database migration

import { 
  createDirectChat, 
  createGroupChat, 
  sendMessage, 
  getUserChats,
  getChatMessages,
  getChatById
} from '../chats'

// Mock test data - replace with actual FIDs from your database
const TEST_USER_FID = 466111 // Your FID
const TEST_TARGET_FID = 12345 // Another user's FID

/**
 * Test creating a direct chat
 * This test should be run manually in a browser console or test environment
 */
export async function testCreateDirectChat() {
  try {
    console.log('🧪 Testing direct chat creation...')
    
    const chatId = await createDirectChat(TEST_USER_FID, TEST_TARGET_FID)
    console.log('✅ Direct chat created:', chatId)
    
    return chatId
  } catch (error) {
    console.error('❌ Direct chat creation failed:', error)
    throw error
  }
}

/**
 * Test creating a group chat
 */
export async function testCreateGroupChat() {
  try {
    console.log('🧪 Testing group chat creation...')
    
    const chatId = await createGroupChat(
      'Test Gaming Squad', 
      [TEST_TARGET_FID, 67890] // Add more test FIDs
    )
    console.log('✅ Group chat created:', chatId)
    
    return chatId
  } catch (error) {
    console.error('❌ Group chat creation failed:', error)
    throw error
  }
}

/**
 * Test sending a message
 */
export async function testSendMessage(chatId: string) {
  try {
    console.log('🧪 Testing message sending...')
    
    const message = await sendMessage({
      chat_id: chatId,
      content: 'Hello! This is a test message from GameLink 🎮',
      message_type: 'text'
    })
    console.log('✅ Message sent:', message)
    
    return message
  } catch (error) {
    console.error('❌ Message sending failed:', error)
    throw error
  }
}

/**
 * Test fetching user chats
 */
export async function testGetUserChats() {
  try {
    console.log('🧪 Testing user chats fetch...')
    
    const chats = await getUserChats()
    console.log('✅ User chats fetched:', chats.length, 'chats')
    console.log('📋 Chats:', chats)
    
    return chats
  } catch (error) {
    console.error('❌ User chats fetch failed:', error)
    throw error
  }
}

/**
 * Test fetching chat messages
 */
export async function testGetChatMessages(chatId: string) {
  try {
    console.log('🧪 Testing chat messages fetch...')
    
    const messages = await getChatMessages(chatId)
    console.log('✅ Chat messages fetched:', messages.length, 'messages')
    console.log('💬 Messages:', messages)
    
    return messages
  } catch (error) {
    console.error('❌ Chat messages fetch failed:', error)
    throw error
  }
}

/**
 * Run all tests in sequence
 */
export async function runAllChatTests() {
  console.log('🚀 Starting chat system tests...')
  
  try {
    // Test 1: Create direct chat
    const directChatId = await testCreateDirectChat()
    
    // Test 2: Send message to direct chat
    await testSendMessage(directChatId)
    
    // Test 3: Create group chat
    const groupChatId = await testCreateGroupChat()
    
    // Test 4: Send message to group chat
    await testSendMessage(groupChatId)
    
    // Test 5: Fetch all user chats
    const userChats = await testGetUserChats()
    
    // Test 6: Fetch messages from first chat
    if (userChats.length > 0) {
      await testGetChatMessages(userChats[0].id)
    }
    
    console.log('🎉 All chat tests completed successfully!')
    
    return {
      directChatId,
      groupChatId,
      userChats
    }
  } catch (error) {
    console.error('💥 Chat tests failed:', error)
    throw error
  }
}

// Instructions for manual testing:
console.log(`
🧪 Chat System Testing Instructions:

1. First, apply the database migration:
   - Go to Supabase Dashboard > SQL Editor
   - Run the contents of database/migrations/004_create_messaging_schema.sql

2. Update the test FIDs in this file:
   - Replace TEST_USER_FID with your actual Farcaster ID
   - Replace TEST_TARGET_FID with another user's FID from your database

3. Run tests in browser console:
   import { runAllChatTests } from './src/lib/supabase/__tests__/chats.test'
   runAllChatTests()

4. Or run individual tests:
   import { testCreateDirectChat } from './src/lib/supabase/__tests__/chats.test'
   testCreateDirectChat()
`) 