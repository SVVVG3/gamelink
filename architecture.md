
# 🎮 Farcaster Gaming Mini App - Architecture

## 🗂 File & Folder Structure

```
/gamelink
├── app/
│   ├── layout.tsx              # Root layout with fonts & global styles
│   ├── page.tsx                # Landing page or dashboard
│   ├── profile/                # User profile page (add/edit gamertags)
│   │   └── [fid]/page.tsx      # Public profile view by Farcaster ID
│   ├── messages/               # 1:1 & group messaging
│   │   └── [chatId]/page.tsx   # Chat UI
│   ├── events/                 # Game night / tournament planner
│   │   ├── new/page.tsx        # Create new event
│   │   └── [eventId]/page.tsx  # Event details & RSVP
│   └── groups/                 # Group management
│       ├── new/page.tsx        # Create group
│       └── [groupId]/page.tsx  # Group chat or info
├── components/
│   ├── GamertagForm.tsx        # Add/edit form for gamertags
│   ├── FriendCodeDisplay.tsx   # Display user’s friend codes
│   ├── MessageComposer.tsx     # Input box to send messages
│   ├── EventCard.tsx           # Reusable event component
│   └── ShareOnFarcaster.tsx    # Button/Frame to cast updates
├── lib/
│   ├── supabaseClient.ts       # Supabase SDK init
│   ├── farcaster.ts            # Neynar/Farcaster API helpers
│   ├── auth.ts                 # Supabase/Farcaster auth utils
│   ├── notifications.ts        # Send FC notifications
│   └── events.ts               # Tournament logic + helpers
├── hooks/
│   ├── useUser.ts              # Grab current user info
│   └── useChat.ts              # Message polling, updates
├── types/
│   └── index.ts                # Shared TS types
├── miniapp/
│   └── frame.tsx               # Farcaster Frame to show events or actions
├── public/
│   └── favicon.ico
├── styles/
│   └── globals.css             # Global styling
├── .env.local                  # Secrets for Supabase, Neynar, etc
├── middleware.ts              # Auth middleware for protected routes
├── next.config.js             # Next.js config
└── package.json
```

---

## ⚙️ What Each Part Does

### **`/app/`**
- All Next.js 13+ route handlers.
- Includes profile editing, chat, events, groups.

### **`/components/`**
- Reusable UI like forms, display blocks, buttons.

### **`/lib/`**
- Logic that integrates with Supabase, Neynar, and Farcaster SDKs.
  - `farcaster.ts` for Neynar token, user info, notifications.
  - `auth.ts` handles sign-in w/ Farcaster + Supabase magic links or JWTs.

### **`/hooks/`**
- Custom React hooks to streamline shared behavior.

### **`/types/`**
- TypeScript definitions like:
```ts
type Gamertag = {
  platform: 'PSN' | 'Xbox' | 'Steam' | 'Switch' | 'Epic';
  handle: string;
};
type Event = {
  id: string;
  title: string;
  time: string;
  game: string;
  organizerFid: number;
};
```

### **`/miniapp/`**
- `frame.tsx` handles Farcaster frame logic — for tournaments/events, quick join buttons, public profile embeds.

---

## 🧠 Where State Lives

| Concern                     | Location                           |
|----------------------------|------------------------------------|
| Auth                       | Supabase Auth w/ Farcaster login   |
| User profiles              | Supabase table: `profiles`         |
| Gamertags / friend codes   | Supabase table: `gamertags`        |
| Messages (DM / group)      | Supabase table: `messages` + `chats` |
| Groups                     | Supabase table: `groups` + `memberships` |
| Tournaments/events         | Supabase table: `events` + `event_participants` |
| Notification preferences   | Supabase table: `notifications`    |
| Farcaster state (fid etc.) | `sdk.context` from Mini App SDK    |

---

## 🔌 How Services Connect

### Authentication
- **Supabase** handles user sessions and email/Farcaster login.
- Upon sign-in, store user `fid`, gamertags, preferences in Supabase.

### Farcaster SDKs
- **Neynar** SDK to:
  - Get list of **mutuals** (users they follow who also follow them)
  - Send in-app + Farcaster **notifications**
  - Post a **Cast** when events are created or gamertags updated

### Supabase (DB + Realtime)
- Store all user data: gamertags, chats, events, friend requests
- Enable **realtime** messaging via Supabase channels or polling
- Hook into Supabase Edge Functions (optional) for more complex tasks (e.g. send a cast after friend request)

### Farcaster Frame Integration
- Users viewing a public profile or an event in their feed can:
  - Tap to **Join** the event
  - Tap to **Send Friend Request**
  - Tap to **Open Chat** (Deep link to your app)

---

## 🔔 Notification Flows

1. **User adds new gamertag** → Post cast via Neynar
2. **User sends friend request on PSN/Xbox/etc** → Trigger in-app + Farcaster notification to recipient
3. **User creates/join event** → Share via Farcaster + update RSVPs in app
4. **Group chat or 1:1 DM** → Realtime message shows in app, optionally sends Farcaster notification
