import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const name = searchParams.get('name') || 'Gaming Group'
    const description = searchParams.get('description') || 'Join our gaming community!'
    const memberCount = searchParams.get('memberCount') || '0'
    const status = searchParams.get('status') || 'initial'
    const creator = searchParams.get('creator') || 'GameLink'

    // Status-specific styling and messages
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'joined':
          return {
            bgColor: 'linear-gradient(135deg, #10b981, #059669)',
            statusText: '✅ You\'re a Member!',
            statusColor: '#ecfdf5'
          }
        case 'request_sent':
          return {
            bgColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
            statusText: '⏳ Request Sent',
            statusColor: '#fffbeb'
          }
        case 'left':
          return {
            bgColor: 'linear-gradient(135deg, #6b7280, #4b5563)',
            statusText: '👋 You Left the Group',
            statusColor: '#f9fafb'
          }
        case 'signup_required':
          return {
            bgColor: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            statusText: '🎮 Sign Up to Join!',
            statusColor: '#f3e8ff'
          }
        case 'admin_cannot_leave':
          return {
            bgColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
            statusText: '👑 You\'re the Admin',
            statusColor: '#fffbeb'
          }
        case 'member':
          return {
            bgColor: 'linear-gradient(135deg, #10b981, #059669)',
            statusText: '🎮 You\'re In!',
            statusColor: '#ecfdf5'
          }
        default:
          return {
            bgColor: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            statusText: '🎮 Join the Squad!',
            statusColor: '#f3e8ff'
          }
      }
    }

    const statusConfig = getStatusConfig(status)

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: statusConfig.bgColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            }}
          />
          
          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '24px',
              padding: '48px',
              margin: '40px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '800px',
              width: '90%',
            }}
          >
            {/* GameLink Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  marginRight: '12px',
                }}
              >
                🎮
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}
              >
                GameLink
              </div>
            </div>

            {/* Group Name */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#111827',
                textAlign: 'center',
                marginBottom: '16px',
                lineHeight: 1.2,
              }}
            >
              {name}
            </div>

            {/* Description */}
            {description && (
              <div
                style={{
                  fontSize: '24px',
                  color: '#4b5563',
                  textAlign: 'center',
                  marginBottom: '24px',
                  maxWidth: '600px',
                  lineHeight: 1.3,
                }}
              >
                {description}
              </div>
            )}

            {/* Member Count */}
            <div
              style={{
                fontSize: '28px',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ marginRight: '12px' }}>👥</span>
              {memberCount} {parseInt(memberCount) === 1 ? 'Member' : 'Members'}
            </div>

            {/* Creator */}
            <div
              style={{
                fontSize: '20px',
                color: '#9ca3af',
                textAlign: 'center',
                marginBottom: '32px',
              }}
            >
              Created by {creator}
            </div>

            {/* Status Badge */}
            <div
              style={{
                background: statusConfig.bgColor,
                color: statusConfig.statusColor,
                fontSize: '24px',
                fontWeight: 'bold',
                padding: '16px 32px',
                borderRadius: '16px',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              {statusConfig.statusText}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e) {
    console.error('Error generating group OG image:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
} 