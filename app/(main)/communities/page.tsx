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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Group, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

// Define the Community interface locally to match API response
interface Community {
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    createdById: string | null
    createdAt: string
    updatedAt: string
}

import { motion, AnimatePresence } from 'motion/react'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

import { useUser } from '@clerk/nextjs'

export default function CommunitiesPage() {
    const { user, isLoaded: userLoaded } = useUser()
    const [search, setSearch] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newImageUrl, setNewImageUrl] = useState('')
    const queryClient = useQueryClient()
    const router = useRouter()

    const role = (user?.publicMetadata as any)?.role?.toLowerCase() || (user?.unsafeMetadata as any)?.role?.toLowerCase()
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const isAdmin = role === 'admin' || email === 'sabedbarbhuiya3@gmail.com'

    const { data: communities, isLoading } = useQuery<Community[]>({
        queryKey: ['all-communities'],
        queryFn: async () => {
            const res = await client.api.communities.all.$get()
            if (!res.ok) throw new Error('Failed to fetch communities')
            return res.json() as unknown as Promise<Community[]>
        }
    })

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await (client.api.communities.$post as any)({
                json: {
                    name: newName,
                    description: newDescription,
                    imageUrl: newImageUrl
                }
            })
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to create community')
            }
            return res.json() as unknown as Promise<Community>
        },
        onSuccess: (newCom) => {
            queryClient.invalidateQueries({ queryKey: ['all-communities'] })
            setIsCreateModalOpen(false)
            setNewName('')
            setNewDescription('')
            setNewImageUrl('')
            router.push(`/communities/${newCom.id}`)
        }
    })

    const filteredCommunities = communities?.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page-wrapper p-8 max-w-5xl mx-auto space-y-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Explore Communities
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Connect with like-minded learners around the globe.
                    </p>
                </div>
                {isAdmin && (
                    <Button
                        size="lg"
                        className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="size-5 mr-2" />
                        Create Community
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Search for subjects, skills, or topics..."
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-none group-focus-within:bg-muted/10 transition-all text-lg shadow-inner"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-3xl bg-muted/50 animate-pulse" />
                    ))}
                </div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {filteredCommunities?.map(c => (
                        <Link key={c.id} href={`/communities/${c.id}`}>
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                                className="group relative h-full flex flex-col bg-card border rounded-3xl overflow-hidden hover:border-primary/50 transition-colors shadow-sm hover:shadow-xl"
                            >
                                <div className="h-40 w-full bg-secondary/30 relative overflow-hidden">
                                    {c.imageUrl ? (
                                        <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Group className="h-12 w-12 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors mb-2 line-clamp-1">{c.name}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                        {c.description || "A safe space for collaborative learning and growth."}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                                            Created {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                        <Button variant="ghost" size="sm" className="rounded-full h-8 px-3 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                    {filteredCommunities?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground">
                            <Search className="size-12 mb-4 opacity-20" />
                            <p className="text-lg">No communities found matching "{search}"</p>
                            <Button variant="link" onClick={() => setSearch('')}>Clear search</Button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Create Community Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-card border rounded-[2rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <h2 className="text-2xl font-bold mb-2">Create a New Community</h2>
                                <p className="text-muted-foreground mb-6">Start a space for people to learn together.</p>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium px-1">Community Name</label>
                                        <Input
                                            placeholder="e.g. Next.js Masters"
                                            className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium px-1">Description</label>
                                        <Textarea
                                            placeholder="What is this community about?"
                                            className="min-h-[120px] rounded-xl bg-muted/20 border-none focus-visible:ring-primary resize-none"
                                            value={newDescription}
                                            onChange={e => setNewDescription(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium px-1">Community Image URL (Optional)</label>
                                        <Input
                                            placeholder="https://example.com/image.png"
                                            className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                                            value={newImageUrl}
                                            onChange={e => setNewImageUrl(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            variant="ghost"
                                            className="flex-1 h-12 rounded-xl"
                                            onClick={() => setIsCreateModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1 h-12 rounded-xl"
                                            disabled={!newName || createMutation.isPending}
                                            onClick={() => createMutation.mutate()}
                                        >
                                            {createMutation.isPending ? "Creating..." : "Create Community"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
