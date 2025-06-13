// Main types file for GameLink Farcaster Gaming Mini App

// Re-export messaging types
export type {
  Chat,
  ChatParticipant,
  Message,
  ChatWithParticipants,
  MessageWithSender,
  CreateChatData,
  SendMessageData
} from '../lib/supabase/chats'

// Re-export profile types
export type {
  Profile,
  CreateProfileData,
  UpdateProfileData
} from '../lib/supabase/profiles'

// Re-export gamertag types
export type {
  Gamertag,
  CreateGamertagData,
  UpdateGamertagData,
  Platform
} from '../lib/supabase/gamertags'

// Farcaster types
export interface FarcasterUser {
  fid: number
  username: string
  display_name?: string
  bio?: string
  pfp_url?: string
  follower_count: number
  following_count: number
  verifications: string[]
}

export interface MutualFollower extends FarcasterUser {
  mutual_followers_count?: number
}

// UI Component types
export interface NavigationItem {
  name: string
  href: string
  icon: string
  badge?: number
}

// =================================
// EVENT TYPES
// =================================

export interface Event {
  id: string
  title: string
  description?: string
  game?: string
  gamingPlatform?: string
  eventType: 'casual' | 'tournament' | 'practice' | 'scrimmage' | 'ranked'
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'any'
  startTime: string
  endTime?: string
  timezone: string
  maxParticipants: number
  minParticipants: number
  requireApproval: boolean
  locationType: 'online' | 'in_person' | 'hybrid'
  connectionDetails?: string
  physicalLocation?: string
  isPrivate: boolean
  allowSpectators: boolean
  registrationDeadline?: string
  status: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled'
  createdBy: string
  groupId?: string
  createdAt: string
  updatedAt: string
}

export interface EventParticipant {
  id: string
  eventId: string
  userId: string
  status: 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled' | 'pending_approval'
  role: 'organizer' | 'moderator' | 'participant' | 'spectator'
  registrationMessage?: string
  approvedBy?: string
  approvedAt?: string
  placement?: number
  score?: number
  notes?: string
  registeredAt: string
  lastUpdatedAt: string
  createdAt: string
  updatedAt: string
}

// Combined types for UI
export interface EventWithParticipantCount extends Event {
  participantCount: number
  isUserParticipant: boolean
  userRole?: 'organizer' | 'moderator' | 'participant' | 'spectator'
  userStatus?: 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled' | 'pending_approval'
}

export interface EventWithParticipants extends Event {
  participants: (EventParticipant & { profile: import('../lib/supabase/profiles').Profile })[]
  participantCount: number
}

export interface EventWithDetails extends EventWithParticipantCount {
  group?: Group
  organizer: import('../lib/supabase/profiles').Profile
}

// Database query options
export interface EventFilters {
  game?: string
  gamingPlatform?: string
  eventType?: string
  skillLevel?: string
  locationType?: string
  status?: string
  createdBy?: string
  groupId?: string
  startTimeAfter?: string
  startTimeBefore?: string
  isPrivate?: boolean
  search?: string
}

export interface CreateEventData {
  title: string
  description?: string
  game?: string
  gamingPlatform?: string
  eventType?: 'casual' | 'tournament' | 'practice' | 'scrimmage' | 'ranked'
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'any'
  startTime: string
  endTime?: string
  timezone?: string
  maxParticipants?: number
  minParticipants?: number
  requireApproval?: boolean
  locationType?: 'online' | 'in_person' | 'hybrid'
  connectionDetails?: string
  physicalLocation?: string
  isPrivate?: boolean
  allowSpectators?: boolean
  registrationDeadline?: string
  groupId?: string
  createdBy?: number  // FID of the user creating the event
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string
  status?: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled'
}

export interface RegisterForEventData {
  eventId: string
  registrationMessage?: string
  role?: 'participant' | 'spectator'
}

// =================================
// GROUP TYPES
// =================================

export interface Group {
  id: string
  name: string
  description?: string
  avatarUrl?: string
  isPrivate: boolean
  maxMembers: number
  allowMemberInvites: boolean
  requireAdminApproval: boolean
  primaryGame?: string
  gamingPlatform?: string
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'any'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface GroupMembership {
  id: string
  groupId: string
  userId: string
  role: 'admin' | 'moderator' | 'member'
  status: 'active' | 'inactive' | 'banned' | 'pending'
  invitedBy?: string
  inviteMessage?: string
  joinedAt: string
  lastActiveAt: string
  createdAt: string
  updatedAt: string
}

export interface GroupInvitation {
  id: string
  groupId: string
  inviterId: string
  inviteeId: string
  message?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: string
  respondedAt?: string
  createdAt: string
  updatedAt: string
}

// Combined types for UI
export interface GroupWithMemberCount extends Group {
  memberCount: number
  isUserMember: boolean
  userRole?: 'admin' | 'moderator' | 'member'
}

export interface GroupWithMembers extends Group {
  members: (GroupMembership & { profile: import('../lib/supabase/profiles').Profile })[]
  memberCount: number
}

export interface GroupInvitationWithDetails extends GroupInvitation {
  group: Group
  inviter: import('../lib/supabase/profiles').Profile
  invitee: import('../lib/supabase/profiles').Profile
}

// Database query options
export interface GroupFilters {
  isPrivate?: boolean
  primaryGame?: string
  gamingPlatform?: string
  skillLevel?: string
  createdBy?: string
  search?: string
}

export interface CreateGroupData {
  name: string
  description?: string
  avatarUrl?: string
  isPrivate?: boolean
  maxMembers?: number
  allowMemberInvites?: boolean
  requireAdminApproval?: boolean
  primaryGame?: string
  gamingPlatform?: string
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'any'
}

export interface UpdateGroupData extends Partial<CreateGroupData> {
  id: string
}

// Notification types
export interface Notification {
  id: string
  user_fid: number
  type: 'message' | 'friend_request' | 'event_invite' | 'group_invite'
  title: string
  content: string
  data?: Record<string, any>
  read: boolean
  created_at: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  has_more: boolean
}

// Form types
export interface FormError {
  field: string
  message: string
}

export interface FormState {
  loading: boolean
  errors: FormError[]
  success?: string
} 