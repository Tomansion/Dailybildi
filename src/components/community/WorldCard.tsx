'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LikeButton } from './LikeButton'
import { WorldWithBlocks } from '@/types/world'
import { useRouter } from 'next/navigation'

interface WorldCardProps {
  world: WorldWithBlocks
  userHasLiked: boolean
  onLike: (worldId: string) => Promise<void>
  onUnlike: (worldId: string) => Promise<void>
}

export function WorldCard({ world, userHasLiked, onLike, onUnlike }: WorldCardProps) {
  const router = useRouter()

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(`/community/${world._key}`)}>
      <CardHeader>
        <CardTitle className="text-lg">{world.username}'s World</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
          {/* Thumbnail preview - simplified for now */}
          <p className="text-sm text-muted-foreground">
            {world.placedBlocks.length} blocks
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Updated {new Date(world.updatedAt).toLocaleDateString()}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <LikeButton
            worldId={world._key}
            initialLiked={userHasLiked}
            initialLikeCount={world.likeCount}
            onLike={onLike}
            onUnlike={onUnlike}
          />
        </div>
      </CardFooter>
    </Card>
  )
}
