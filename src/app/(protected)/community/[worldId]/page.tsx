'use client'

import { useEffect, useState, useRef } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Heart } from 'lucide-react'
import dynamic from 'next/dynamic'
import { LikeButton } from '@/components/community/LikeButton'

const PhaserCanvas = dynamic(
  () => import('@/components/editor/PhaserCanvas').then((mod) => mod.PhaserCanvas),
  { ssr: false }
)

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function WorldViewerPage({ params }: { params: { worldId: string } }) {
  const router = useRouter()
  const { data: worldData } = useSWR(`/api/world/${params.worldId}`, fetcher)
  const { data: catalogData } = useSWR('/api/blocks/catalog', fetcher)
  const { data: userLikesData, mutate: mutateLikes } = useSWR('/api/likes', fetcher)

  const world = worldData?.data?.world
  const placedBlocks = worldData?.data?.placedBlocks || []
  const blockImages = catalogData?.data || []
  const userLikes = userLikesData?.data || []

  const handleLike = async (worldId: string) => {
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldId }),
    })
    mutateLikes()
  }

  const handleUnlike = async (worldId: string) => {
    await fetch(`/api/likes?worldId=${worldId}`, {
      method: 'DELETE',
    })
    mutateLikes()
  }

  if (!world) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/community')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{world.username}'s World</h1>
            <p className="text-sm text-muted-foreground">
              {placedBlocks.length} blocks placed
            </p>
          </div>
        </div>
        <LikeButton
          worldId={world._key}
          initialLiked={userLikes.includes(world._key)}
          initialLikeCount={world.likeCount}
          onLike={handleLike}
          onUnlike={handleUnlike}
        />
      </div>

      {/* Canvas (Read-only) */}
      <div className="flex-1">
        <PhaserCanvas
          placedBlocks={placedBlocks}
          blockImages={blockImages}
          onBlockPlaced={async () => {}} // No-op for read-only
          onBlockUpdated={async () => {}} // No-op for read-only
          onBlockSelected={() => {}} // No-op for read-only
          selectedBlockForPlacement={null}
        />
      </div>
    </div>
  )
}
