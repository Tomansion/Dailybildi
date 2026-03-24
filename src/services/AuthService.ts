import bcrypt from 'bcryptjs'
import { UserQueries } from '@/lib/db/queries/users'
import { User, RegisterData, LoginCredentials } from '@/types/user'

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static async createUser(data: RegisterData): Promise<User> {
    // Check if username exists
    const existingUser = await UserQueries.findByUsername(data.username)
    if (existingUser) {
      throw new Error('Username already exists')
    }

    // Check if email exists
    const existingEmail = await UserQueries.findByEmail(data.email)
    if (existingEmail) {
      throw new Error('Email already exists')
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password)

    // Create user
    const user = await UserQueries.createUser({
      username: data.username,
      email: data.email,
      passwordHash,
      createdAt: new Date().toISOString(),
      receivedInitialBlocks: false,
    })

    return user
  }

  static async verifyCredentials(credentials: LoginCredentials): Promise<User | null> {
    const user = await UserQueries.findByUsername(credentials.username)
    
    if (!user) {
      return null
    }

    const isValid = await this.verifyPassword(credentials.password, user.passwordHash)
    
    if (!isValid) {
      return null
    }

    return user
  }

  static async getUserById(userId: string): Promise<User | null> {
    return UserQueries.findById(userId)
  }
}
