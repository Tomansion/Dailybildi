import { NextResponse } from 'next/server'
import { AuthService } from '@/services/AuthService'
import { InventoryService } from '@/services/InventoryService'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    console.log("1");
    
    
    // Validation
    if (!username  || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log("2");
    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 4 characters' },
        { status: 400 }
      )
    }
    console.log("3");
    
    // Create user
    const user = await AuthService.createUser({ username, password })
    
    console.log("4");
    // Initialize inventory and world
    await InventoryService.initializeUserInventory(user._key)
    console.log("5");

    return NextResponse.json({
      success: true,
      data: {
        id: user._key,
        username: user.username,
      },
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 400 }
    )
  }
}
