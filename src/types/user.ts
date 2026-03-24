export interface User {
  _key: string
  username: string
  email: string
  passwordHash: string
  createdAt: string
  firstLoginAt?: string
  receivedInitialBlocks: boolean
}

export interface UserSession {
  id: string
  username: string
  email: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}
