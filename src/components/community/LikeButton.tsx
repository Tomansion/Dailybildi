'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface LikeButtonProps {
  worldId: string
  initialLiked: boolean
  initialLikeCount: number
  onLike: (worldId: string) => Promise<void>
  onUnlike: (worldId: string) => Promise<void>
}

export function LikeButton({
  worldId,
  initialLiked,
  initialLikeCount,
  onLike,
  onUnlike,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (liked) {
        await onUnlike(worldId)
        setLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        await onLike(worldId)
        setLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={liked ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
      {likeCount}
    </Button>
  )
}
