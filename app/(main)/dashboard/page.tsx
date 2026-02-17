'use client'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { client } from '@/lib/api-client'
import { useUser } from '@clerk/nextjs'
import { Group, MessageCircle, User2Icon, UserIcon, ArrowRight, X, LogOut, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Helper to get initials
function getInitials(name: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || name[0]?.toUpperCase() || 'U';
}

// Matches your API response shape
interface Community {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
}

interface DashboardStats {
  communities: number
  activeMatches: number
}

interface RecentChat {
  matchId: string
  otherUser: {
    id: string
    name: string
    imageUrl: string | null
  }
  communityName: string
  lastMessage: string
  lastMessageAt: string | null
}

export default function Dashboard() {
  const { user } = useUser()
  const router = useRouter()
  const [isJoinedViewOpen, setIsJoinedViewOpen] = useState(false)
  const queryClient = useQueryClient()

  // 1. Fetch Communities (using the new correct endpoint)
  const { data: communitiesData, isLoading: communitiesLoading } = useQuery<Community[]>({
    queryKey: ['user-communities'],
    queryFn: async () => {
      const res = await client.api.communities.$get()
      if (!res.ok) throw new Error('Failed to fetch communities')
      return res.json() as unknown as Promise<Community[]>
    }
  })

  // 2. Fetch Dashboard Stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await client.api.dashboard.stats.$get()
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as unknown as Promise<DashboardStats>
    }
  })

  // 3. Fetch Recent Chats
  const { data: recentChats, isLoading: chatsLoading } = useQuery<RecentChat[]>({
    queryKey: ['recent-chats'],
    queryFn: async () => {
      const res = await client.api.dashboard.recent.$get()
      if (!res.ok) throw new Error('Failed to fetch recent chats')
      return res.json() as unknown as Promise<RecentChat[]>
    }
  })

  const leaveMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const res = await (client.api.communities as any)[':id'].leave.$post({
        param: { id: communityId }
      })
      if (!res.ok) throw new Error('Failed to leave community')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-communities'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })

  const isLoading = communitiesLoading || statsLoading || chatsLoading

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )

  return (
    <div className="page-wrapper p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.firstName || 'Learner'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here's what's happening in your learning journey.
          </p>
        </div>
        <Link href="/communities" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto shadow-sm transition-all hover:shadow-md active:scale-95">
            Explore Communities
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:border-primary/50 transition-all hover:shadow-sm cursor-pointer active:scale-[0.98]"
          onClick={() => setIsJoinedViewOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Joined Communities</CardTitle>
            <Group className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.communities || 0}</div>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-all hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Matches</CardTitle>
            <User2Icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats?.activeMatches || 0}</div>
          </CardContent>
        </Card>
        {/* Placeholders for future stats */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-1">
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-bold">SOON</span>
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Learning Goals</CardTitle>
            <div className="h-4 w-4 text-primary flex items-center justify-center text-xs">🎯</div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">-</div>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-all hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Streak</CardTitle>
            <div className="h-4 w-4 text-orange-500 flex items-center justify-center text-xs">🔥</div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full w-fit">
              1 Day
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Chats Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  Recent Conversations
                </CardTitle>
              </div>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentChats && recentChats.length > 0 ? (
                  recentChats.map((chat: RecentChat) => (
                    <Link href={`/chat/${chat.matchId}`} key={chat.matchId} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={chat.otherUser.imageUrl || ''} />
                        <AvatarFallback>{getInitials(chat.otherUser.name || 'User')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-medium truncate">{chat.otherUser.name}</h4>
                          {chat.lastMessageAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(chat.lastMessageAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-medium">
                            {chat.communityName}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent conversations.</p>
                    <Link href="/communities">
                      <Button variant="link" className="mt-2 text-primary">Find a partner &rarr;</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communities Sidebar (1/3 width) */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Group className="size-5 text-primary" />
                  Your Communities
                </CardTitle>
                <Link href="/communities">
                  <Button variant="ghost" size="sm" className="h-8">View All</Button>
                </Link>
              </div>
              <CardDescription>Communities you have joined</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {communitiesData?.map((c: Community) => (
                  <Link href={`/communities/${c.id}`} key={c.id}>
                    <div className="group flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <Group className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{c.name}</h4>
                        {c.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                )) || (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <p>You haven't joined any communities yet.</p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Joined Communities Modal */}
      <AnimatePresence>
        {isJoinedViewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinedViewOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh]"
            >
              <div className="p-6 sm:p-8 border-b flex justify-between items-center bg-muted/20">
                <div>
                  <h2 className="text-2xl font-bold">Your Communities</h2>
                  <p className="text-muted-foreground text-sm">Managed your joined learning spaces.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsJoinedViewOpen(false)} className="rounded-full">
                  <X className="size-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {communitiesData && communitiesData.length > 0 ? (
                  communitiesData.map((com: Community) => (
                    <div key={com.id} className="group flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-muted overflow-hidden shrink-0">
                          {com.imageUrl ? (
                            <img src={com.imageUrl} alt={com.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
                              <Group className="size-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold">{com.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{com.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/communities/${com.id}`}>
                          <Button variant="outline" size="sm" className="rounded-full px-4 border-2">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full px-4 text-destructive hover:bg-destructive/10 hover:text-destructive group/leave"
                          onClick={() => {
                            if (confirm(`Leave ${com.name}?`)) {
                              leaveMutation.mutate(com.id)
                            }
                          }}
                          disabled={leaveMutation.isPending}
                        >
                          {leaveMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <LogOut className="sx-4 mr-2" />
                              Leave
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>You haven't joined any communities yet.</p>
                    <Button variant="link" onClick={() => {
                      setIsJoinedViewOpen(false)
                      router.push('/communities')
                    }}>Find communities &rarr;</Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

