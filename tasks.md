
# 🎮 Farcaster Gaming Mini App - MVP Build Plan

Each task is intentionally small, testable, and focused on one concern.

---

## 🏁 Phase 1: Setup & Authentication

### 1. Initialize Next.js project
- **Start**: `npx create-next-app@latest gamelink`
- **End**: App boots locally with default homepage

### 2. Install necessary dependencies
- `supabase-js`, `@supabase/auth-helpers-nextjs`, `@neynar/nodejs-sdk`, `@farcaster/core`
- Add TailwindCSS if desired

### 3. Configure Supabase client
- **Start**: Create `lib/supabaseClient.ts`
- **End**: Supabase client is accessible throughout app

### 4. Set up Supabase Auth
- Enable Sign in with Farcaster via magic link or embedded auth
- **End**: Users can log in and `useUser()` returns a valid user

---

## 👤 Phase 2: User Profiles & Gamertags

### 5. Create Supabase schema for `profiles` and `gamertags`
- **Start**: Define schema locally or in dashboard
- **End**: Tables `profiles` and `gamertags` exist

### 6. Implement `useUser()` hook
- **Start**: Create in `hooks/useUser.ts`
- **End**: Returns current Supabase user + metadata

### 7. Build `GamertagForm.tsx` component
- Allows user to add gamertags for platforms (PSN, Xbox, Steam, etc.)
- **End**: Form saves data to Supabase `gamertags` table

### 8. Display current user's gamertags
- **Start**: Create `components/FriendCodeDisplay.tsx`
- **End**: Lists gamertags under profile

---

## 👥 Phase 3: Social Graph

### 9. Fetch mutual followers via Neynar API
- **Start**: Create `lib/farcaster.ts`
- **End**: Returns mutual followers for logged-in user

### 10. Display mutual followers + their gamertags
- **Start**: Use `FriendCodeDisplay` for each user
- **End**: UI shows mutual connections with gamertags

---

## 💬 Phase 4: Messaging

### 11. Create Supabase schema for `chats` and `messages`
- 1:1 and group chats
- **End**: Schema created

### 12. Build `MessageComposer.tsx`
- Input box that sends messages to a thread
- **End**: Sends new message to Supabase `messages` table

### 13. Build message list view
- Fetch messages by `chatId`
- **End**: Messages are displayed in order in `/messages/[chatId]`

---

## 👨‍👩‍👧‍👦 Phase 5: Groups

### 14. Create Supabase schema for `groups` and `memberships`
- Store group metadata + users per group
- **End**: Schema created

### 15. Create new group form
- UI to name group + invite mutuals
- **End**: Group record + memberships created

### 16. Display group chat
- Pull all messages from a group chat thread
- **End**: Group chat UI functional

---

## 🏆 Phase 6: Events & Tournaments

### 17. Create Supabase schema for `events` + `event_participants`
- **End**: Schema created

### 18. Build create event UI
- `/events/new`
- **End**: User creates event with title, game, time

### 19. Display event details + RSVP button
- `/events/[eventId]`
- **End**: Participants saved to Supabase when RSVP’d

---

## 📣 Phase 7: Notifications & Sharing

### 20. Send Farcaster notification via Neynar
- When new message sent or event created
- **End**: Neynar API sends notification

### 21. Share new event / gamertag update on Farcaster
- Create `ShareOnFarcaster.tsx` button
- **End**: Clicking button triggers cast via Neynar

---

## 🖼 Phase 8: Frame Integration

### 22. Build `miniapp/frame.tsx` to show event join UI
- Accepts eventId as param
- **End**: Render miniapp frame showing event + Join button

### 23. Frame Join button calls RSVP endpoint
- **End**: Clicking in Farcaster adds user as RSVP’d

---

## ✅ Final: Polish & Test

### 24. Auth protection on private routes
- Redirect if not signed in
- **End**: `/messages`, `/groups`, `/events/new` require auth

### 25. Basic responsive styling
- Tailwind or similar
- **End**: Usable on mobile & desktop

### 26. Deploy to Vercel or Railway
- Connect Supabase + ENV vars
- **End**: Public URL is live and working
