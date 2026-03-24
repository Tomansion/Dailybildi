import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getUserSession } from '@/lib/auth/session'
import { InventoryService } from '@/services/InventoryService'

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getUserSession()

  if (!user) {
    redirect('/login')
  }

  // Ensure inventory is initialized
  await InventoryService.initializeUserInventory(user.id)

  return <>{children}</>
}
