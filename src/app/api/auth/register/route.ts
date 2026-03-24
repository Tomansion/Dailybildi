import { NextResponse } from 'next/server'
import { AuthService } from '@/services/AuthService'
import { InventoryService } from '@/services/InventoryService'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, email, password } = body

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create user
    const user = await AuthService.createUser({ username, email, password })

    // Initialize inventory and world
    await InventoryService.initializeUserInventory(user._key)

    return NextResponse.json({
      success: true,
      data: {
        id: user._key,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 400 }
    )
  }
}
