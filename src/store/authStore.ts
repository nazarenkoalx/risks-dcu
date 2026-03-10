import { create } from 'zustand'
import { users, type User } from '../mock-data/users'

interface AuthState {
  currentUser: User
  switchUser: (userId: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: users[0], // CRO по умолчанию
  switchUser: (userId) => {
    const user = users.find((u) => u.id === userId)
    if (user) set({ currentUser: user })
  },
}))
