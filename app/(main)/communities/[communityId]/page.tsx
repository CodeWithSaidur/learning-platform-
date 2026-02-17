'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { client } from '@/lib/api-client'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Group, Target } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, MessageCircle, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Community {
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    createdById: string | null
    createdAt: string
    updatedAt: string
}

interface LearningGoal {
    id: string
    title: string
    description: string | null
    createdAt: string
}

interface MatchResult {
    userId: string
    matchId: string | null
    matchScore: number
    reason: string
}

interface Member {
    id: string
    name: string
    imageUrl: string | null
    joinedAt: string
}

export default function CommunityDetailsPage() {
    const { communityId } = useParams()
    const { user } = useUser()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [newGoalTitle, setNewGoalTitle] = useState('')
    const [matches, setMatches] = useState<MatchResult[]>([])

    // 1. Fetch Community Details
    const { data: community, isLoading: communityLoading } = useQuery<Community>({
        queryKey: ['community', communityId],
        queryFn: async () => {
            const res = await (client.api.communities as any)[':id'].$get({
                param: { id: communityId as string }
            })
            if (!res.ok) throw new Error('Failed to fetch community')
            return res.json() as unknown as Promise<Community>
        }
    })

    // 2. Fetch User's Goals in this community
    const { data: goals, isLoading: goalsLoading } = useQuery<LearningGoal[]>({
        queryKey: ['community-goals', communityId],
        queryFn: async () => {
            const res = await (client.api.communities as any)[':id'].goals.$get({
                param: { id: communityId as string }
            })
            if (!res.ok) return [] // Assume failure means no goals or not member
            return res.json() as unknown as Promise<LearningGoal[]>
        }
    })

    // 3. Fetch Membership Status
    const { data: membershipData } = useQuery<{ isMember: boolean }>({
        queryKey: ['community-membership', communityId],
        queryFn: async () => {
            const res = await (client.api.communities as any)[':id'].membership.$get({
                param: { id: communityId as string }
            })
            if (!res.ok) return { isMember: false }
            return res.json() as unknown as Promise<{ isMember: boolean }>
        }
    })

    const isMember = membershipData?.isMember || false

    // 4. Join Community Mutation
    const joinMutation = useMutation({
        mutationFn: async () => {
            const res = await (client.api.communities as any)[':id'].join.$post({
                param: { id: communityId as string }
            })
            if (!res.ok) throw new Error('Failed to join')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] })
            queryClient.invalidateQueries({ queryKey: ['community-goals', communityId] })
            queryClient.invalidateQueries({ queryKey: ['user-communities'] })
            // alert('Joined community!')
        }
    })

    // 4. Create Goal Mutation
    const createGoalMutation = useMutation({
        mutationFn: async () => {
            const res = await (client.api.communities as any)[':id'].goals.$post({
                param: { id: communityId as string },
                json: { title: newGoalTitle }
            })
            if (!res.ok) throw new Error('Failed to create goal')
            return res.json()
        },
        onSuccess: () => {
            setNewGoalTitle('')
            queryClient.invalidateQueries({ queryKey: ['community-goals', communityId] })
        }
    })

    // 5. Run AI Match Mutation
    const matchMutation = useMutation({
        mutationFn: async () => {
            const res = await (client.api.communities as any)[':id'].match.$post({
                param: { id: communityId as string }
            })
            if (!res.ok) throw new Error('Failed to matching')
            return res.json() as unknown as Promise<{ matches: MatchResult[] }>
        },
        onSuccess: (data) => {
            setMatches(data.matches)
            if (data.matches.length === 0) {
                // alert('No matches found yet. Try adding more specific goals!')
            }
        }
    })

    // 6. Fetch Members
    const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
        queryKey: ['community-members', communityId],
        queryFn: async () => {
            const res = await (client.api.communities as any)[':id'].members.$get({
                param: { id: communityId as string }
            })
            if (!res.ok) throw new Error('Failed to fetch members')
            return res.json() as unknown as Promise<Member[]>
        }
    })

    // 7. Connect Mutation
    const connectMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            const res = await (client.api.communities as any)[':id'].members[':targetUserId'].connect.$post({
                param: {
                    id: communityId as string,
                    targetUserId
                }
            })
            if (!res.ok) throw new Error('Failed to connect')
            return res.json() as { matchId: string }
        },
        onSuccess: (data) => {
            router.push(`/chat/${data.matchId}`)
        }
    })


    if (communityLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="size-8 animate-spin text-primary opacity-50" />
        </div>
    )
    if (!community) return <div className="p-8 text-center">Community not found</div>

    return (
        <div className="page-wrapper p-4 sm:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-12">
            {/* Banner / Header */}
            <div className="relative overflow-hidden bg-card border rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mb-32 blur-3xl" />

                <div className="relative flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start text-center md:text-left">
                    <div className="h-24 w-24 sm:h-32 sm:w-32 bg-muted rounded-2xl sm:rounded-3xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden border-2 sm:border-4 border-background">
                        {community.imageUrl ? (
                            <img src={community.imageUrl} alt={community.name} className="h-full w-full object-cover" />
                        ) : (
                            <Group className="h-12 w-12 text-muted-foreground/40" />
                        )}
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">{community.name}</h1>
                            <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto md:mx-0">{community.description}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 items-center justify-center md:justify-start">
                            {isMember ? (
                                <Badge variant="secondary" className="h-10 px-4 rounded-full text-sm font-medium w-full sm:w-auto justify-center">Member</Badge>
                            ) : (
                                <Button size="lg" className="rounded-full h-11 sm:h-12 px-8 shadow-lg shadow-primary/20 w-full sm:w-auto" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
                                    {joinMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                                    Join Community
                                </Button>
                            )}
                            <Button size="lg" variant="outline" className="rounded-full h-11 sm:h-12 px-8 border-2 w-full sm:w-auto" onClick={() => matchMutation.mutate()} disabled={matchMutation.isPending || !isMember}>
                                {matchMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4 text-primary" />}
                                Find Partners
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Matches Section */}
            {matches.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Sparkles className="size-6 text-primary" />
                            AI Recommended Partners
                        </h2>
                        <Button variant="ghost" size="sm" onClick={() => setMatches([])}>Dismiss</Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {matches.map((match, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="border-primary/20 bg-primary/5 hover:bg-primary/[0.08] transition-colors rounded-[2rem] overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                    {match.userId.substring(0, 1).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-lg">Partner Match</span>
                                            </div>
                                            <Badge className="bg-primary hover:bg-primary/90 rounded-full h-7 px-3">
                                                {match.matchScore}% Match
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-foreground/70 leading-relaxed italic">
                                            "{match.reason}"
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            className="w-full rounded-xl h-11 shadow-sm"
                                            disabled={!match.matchId}
                                            onClick={() => match.matchId && router.push(`/chat/${match.matchId}`)}
                                        >
                                            {match.matchId ? "Start Conversation" : "Score too low to connect"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            <Tabs defaultValue="goals" className="w-full">
                <TabsList>
                    <TabsTrigger value="goals">Learning Goals</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>
                <TabsContent value="goals" className="mt-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Goals List */}
                        <div className="md:col-span-2 space-y-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Target className="size-5" />
                                Your Learning Goals
                            </h2>
                            {goals?.length === 0 ? (
                                <p className="text-muted-foreground">You haven't set any goals in this community yet.</p>
                            ) : (
                                goals?.map(goal => (
                                    <Card key={goal.id}>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                                            {goal.description && <CardDescription>{goal.description}</CardDescription>}
                                        </CardHeader>
                                    </Card>
                                ))
                            )}
                        </div>

                        {/* Create Goal Sidebar */}
                        <div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Set a New Goal</CardTitle>
                                    <CardDescription>What do you want to achieve here?</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input
                                        placeholder="I want to build a..."
                                        value={newGoalTitle}
                                        onChange={e => setNewGoalTitle(e.target.value)}
                                    />
                                    <Button
                                        className="w-full"
                                        onClick={() => createGoalMutation.mutate()}
                                        disabled={!newGoalTitle || createGoalMutation.isPending}
                                    >
                                        <Plus className="size-4 mr-2" />
                                        Add Goal
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="members" className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {membersLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
                            ))
                        ) : members?.map(member => (
                            <motion.div
                                key={member.id}
                                whileHover={{ scale: 1.02 }}
                                className="group flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="size-12 border-2 border-background shadow-sm">
                                        <AvatarImage src={member.imageUrl || ''} />
                                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                            {member.name.substring(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-bold group-hover:text-primary transition-colors line-clamp-1">{member.name}</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {member.id !== user?.id && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-full hover:bg-primary hover:text-primary-foreground"
                                        onClick={() => connectMutation.mutate(member.id)}
                                        disabled={connectMutation.isPending}
                                    >
                                        <MessageCircle className="size-4" />
                                    </Button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="about">
                    <p className="text-muted-foreground">Created on {new Date(community.createdAt).toLocaleDateString()}</p>
                </TabsContent>
            </Tabs>

        </div>
    )
}
