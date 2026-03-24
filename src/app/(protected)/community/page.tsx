'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { WorldCard } from '@/components/community/WorldCard'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CommunityPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'likes' | 'recent'>('recent')

  const { data: worldsData, mutate } = useSWR(
    `/api/community?sortBy=${sortBy}`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const { data: userLikesData } = useSWR('/api/likes', fetcher)

  const worlds = worldsData?.data || []
  const userLikes = userLikesData?.data || []

  const handleLike = async (worldId: string) => {
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldId }),
    })
    mutate()
  }

  const handleUnlike = async (worldId: string) => {
    await fetch(`/api/likes?worldId=${worldId}`, {
      method: 'DELETE',
    })
    mutate()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/canvas')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Community Worlds</h1>
        </div>

        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'likes' | 'recent')}>
          <TabsList>
            <TabsTrigger value="recent">Recently Modified</TabsTrigger>
            <TabsTrigger value="likes">Most Liked</TabsTrigger>
          </TabsList>

          <TabsContent value={sortBy} className="mt-6">
            {worlds.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No worlds to display yet
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {worlds.map((world: any) => (
                  <WorldCard
                    key={world._key}
                    world={world}
                    userHasLiked={userLikes.includes(world._key)}
                    onLike={handleLike}
                    onUnlike={handleUnlike}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
