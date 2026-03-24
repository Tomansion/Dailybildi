'use client'

import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HomeButtonProps {
  onClick: () => void
}

export function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="secondary"
      className="fixed top-4 right-4 z-10 shadow-lg"
      title="Go to center"
    >
      <Home className="h-5 w-5" />
    </Button>
  )
}
