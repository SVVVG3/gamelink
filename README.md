# 🎮 GameLink

**Connect with fellow gamers on Farcaster**

GameLink is a Farcaster Mini App that helps gamers connect, share their gaming profiles, and organize gaming sessions. Built with Next.js, Supabase, and the Farcaster ecosystem.

![GameLink Demo](https://via.placeholder.com/800x400/1f2937/ffffff?text=GameLink+Demo)

## ✨ Features

### 🔐 **Authentication & Profiles**
- **Farcaster Integration**: Sign in with your Farcaster account using Neynar's AuthKit
- **Profile Sync**: Automatic synchronization between Farcaster and Supabase profiles
- **Gaming Identity**: Manage your gaming persona with custom gamertags

### 🎯 **Gaming Profiles**
- **Multi-Platform Support**: Add gamertags for PSN, Xbox, Steam, Nintendo, Epic, Discord, Riot, and Pokémon GO
- **Public/Private Settings**: Control visibility of your gaming profiles
- **Easy Management**: Add, edit, and delete gamertags with a beautiful interface

### 👥 **Social Features**
- **Mutual Followers**: Discover gaming friends among your Farcaster mutual connections
- **Smart Filtering**: Filter by users with gaming profiles vs. all connections
- **Unlimited Loading**: Progressive loading of all mutual followers with "Load More" functionality
- **Search & Filter**: Find specific friends quickly with real-time search

### 📱 **Mobile-First Design**
- **Bottom Navigation**: App-like navigation optimized for mobile devices
- **Dark Gaming Theme**: Beautiful dark mode interface perfect for gamers
- **Responsive Layout**: Works seamlessly on mobile, tablet, and desktop
- **Touch-Friendly**: Optimized for touch interactions and thumb navigation

## 🚀 Current Status

**✅ Completed Tasks (1-10):**
1. ✅ Next.js project initialization
2. ✅ Dependencies installation (Supabase, Neynar, Farcaster AuthKit)
3. ✅ Supabase client configuration
4. ✅ Farcaster authentication setup
5. ✅ Database schema for profiles and gamertags
6. ✅ useUser hook implementation
7. ✅ Gamertag management system
8. ✅ Gaming profile display
9. ✅ Mutual followers API integration
10. ✅ Mutual followers display with bottom navigation

**🚧 Upcoming Features:**
- 💬 Messaging system (Task 11-13)
- 👨‍👩‍👧‍👦 Group management (Task 14-16)
- 🏆 Events & tournaments (Task 17-19)
- 📣 Notifications & sharing (Task 20-21)
- 🖼 Farcaster Frame integration (Task 22-23)
- ✨ Polish & deployment (Task 24-26)

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Farcaster AuthKit + Neynar
- **APIs**: Neynar API for Farcaster data
- **Icons**: React Icons (FontAwesome)
- **Deployment**: Vercel (planned)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gamelink.git
   cd gamelink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Neynar
   NEXT_PUBLIC_NEYNAR_CLIENT_ID=your_neynar_client_id
   NEYNAR_API_KEY=your_neynar_api_key
   ```

4. **Set up Supabase database**
   - Create tables using the schema in `src/lib/supabase/`
   - Enable Row Level Security (RLS)
   - Set up authentication policies

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄 Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fid INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  pfp_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Gamertags Table
```sql
CREATE TABLE gamertags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('PSN', 'Xbox', 'Steam', 'Nintendo', 'Epic', 'Discord', 'Riot', 'PokemonGO')),
  gamertag TEXT NOT NULL,
  display_name TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, platform)
);
```

## 🎮 Usage

1. **Sign In**: Connect your Farcaster account using the sign-in button
2. **Add Gamertags**: Navigate to your profile and add gaming handles for different platforms
3. **Find Friends**: Visit the Friends page to see mutual followers with gaming profiles
4. **Connect**: Copy gamertags and start gaming together!

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Farcaster**: For the amazing decentralized social protocol
- **Neynar**: For providing excellent Farcaster APIs and authentication
- **Supabase**: For the powerful backend-as-a-service platform
- **Next.js**: For the incredible React framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/gamelink/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/gamelink/discussions)
- **Farcaster**: [@yourusername](https://warpcast.com/yourusername)

---

**Built with ❤️ for the Farcaster gaming community**
