# GameLink Database Schema

This directory contains SQL migration files for the GameLink Farcaster Gaming Mini App.

## Migrations

### 004_create_messaging_schema.sql

Creates the messaging system schema with support for both 1:1 and group chats.

**Tables Created:**
- `chats` - Main chat records (direct or group)
- `chat_participants` - Many-to-many relationship between users and chats
- `messages` - Individual messages within chats

**Features:**
- Row Level Security (RLS) policies for data protection
- Automatic timestamp updates
- Support for message threading (replies)
- Soft delete for messages
- Admin roles for group chats
- Database function for creating direct chats

## How to Apply Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `004_create_messaging_schema.sql`
4. Click "Run" to execute the migration

### Option 2: Supabase CLI (if you have it set up)
```bash
supabase db push
```

### Option 3: Manual SQL Execution
Connect to your PostgreSQL database and run the SQL file directly.

## Schema Overview

### Chats Table
- Supports both `direct` (1:1) and `group` chat types
- Optional names for group chats
- Tracks creation, updates, and last message timestamps
- Soft delete with `is_active` flag

### Chat Participants Table
- Links users to chats they participate in
- Stores Farcaster ID (FID) for easy lookup
- Tracks join/leave timestamps
- Admin flag for group chat management
- Unique constraint prevents duplicate participants

### Messages Table
- Stores all chat messages
- Links to sender via user ID and FID
- Supports different message types (text, image, file, system)
- Threading support with `reply_to` field
- Edit and delete tracking
- Soft delete functionality

## Security

All tables have Row Level Security (RLS) enabled with policies that ensure:
- Users can only see chats they participate in
- Users can only send messages to chats they're members of
- Only message senders can edit their own messages
- Chat creators and admins can manage group settings

## Functions

### create_direct_chat(user1_id, user1_fid, user2_id, user2_fid)
- Creates a new direct chat between two users
- Returns existing chat ID if one already exists
- Automatically adds both users as participants

## Triggers

### update_chat_last_message
- Automatically updates `last_message_at` timestamp when new messages are sent
- Keeps chat list sorted by most recent activity

## Indexes

Performance indexes are created for:
- Chat lookups by creator and type
- Participant lookups by chat and user
- Message lookups by chat and sender
- Timestamp-based sorting

## Next Steps

After applying this migration, you can:
1. Use the TypeScript functions in `src/lib/supabase/chats.ts`
2. Build UI components for messaging (Task 12)
3. Implement real-time message updates
4. Add message notifications 