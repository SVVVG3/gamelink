import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // For now, just return success - AuthKit handles the verification
    // In a production app, you'd verify the SIWE message here
    console.log('Login request received:', body)
    
    return NextResponse.json({ 
      success: true,
      message: 'Login successful' 
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Login endpoint active' })
} 