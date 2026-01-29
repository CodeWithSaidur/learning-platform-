'use client'

import { client } from '@/lib/api-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useRouter } from 'next/navigation'
import { pusherClient } from '@/lib/pusher-client'

interface Message {
    id: string
    content: string
    senderId: string
    createdAt: string
}

interface ChatData {
    conversation: { id: string }
    messages: Message[]
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

function MessageBubble({ message }: { message: Message }) {
    const { user } = useUser()
    // Ideally we check if message.senderId matches current user's DB ID.
    // Since we don't have that easily on client without another fetch, we will style them neutrally 
    // OR we could check if senderId matches the partnerId from params? (which we don't have here).
    // For now, styling them as "received" generic bubbles for simplicity, or left-aligned.

    return (
        <div className={cn("flex flex-col max-w-[80%]",
            "border p-3 rounded-lg bg-muted/50"
        )}>
            <p className="text-sm">{message.content}</p>
            <span className="text-[10px] text-muted-foreground mt-1 self-end">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    )
}

import { Sparkles, Loader2, ListTodo, Target, Lightbulb, MessageCircle, Trash2 } from 'lucide-react'

interface SummaryData {
    summary: string
    actionItems: string[]
    keyPoints: string[]
    nextSteps: string[]
}

export default function ChatWindowPage() {
    const { matchId } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [newMessage, setNewMessage] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    const { data: me } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await client.api.dashboard.me.$get()
            if (!res.ok) return null
            return res.json()
        }
    })

    // Initial fetch of messages
    const { data, isLoading: messagesLoading } = useQuery<ChatData>({
        queryKey: ['chat', matchId],
        queryFn: async () => {
            const res = await client.api.chat[':matchId'].messages.$get({
                param: { matchId: matchId as string }
            })
            if (!res.ok) throw new Error('Failed to load chat')
            return res.json() as unknown as Promise<ChatData>
        }
    })

    // Manage messages locally to allow real-time updates without full refetch
    const [messages, setMessages] = useState<Message[]>([])

    useEffect(() => {
        if (data?.messages) {
            setMessages(data.messages)
        }
    }, [data?.messages])

    // Subscribe to Pusher channel for real-time updates
    useEffect(() => {
        if (!data?.conversation.id) return

        const channelName = `chat-${data.conversation.id}`
        const channel = pusherClient.subscribe(channelName)

        channel.bind('new-message', (newMessage: Message) => {
            setMessages(prev => {
                // Prevent duplicate messages if the sender also gets the event
                if (prev.some(m => m.id === newMessage.id)) return prev
                return [...prev, newMessage]
            })
        })

        return () => {
            pusherClient.unsubscribe(channelName)
            channel.unbind_all()
        }
    }, [data?.conversation.id])

    const isLoading = messagesLoading || !me

    const deleteChatMutation = useMutation({
        mutationFn: async () => {
            const res = await (client.api.chat as any)[':matchId'].$delete({
                param: { matchId: matchId as string }
            })
            if (!res.ok) throw new Error('Failed to delete')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            router.push('/chat')
        }
    })

    const sendMessageMutation = useMutation({
        mutationFn: async () => {
            if (!newMessage.trim()) return;
            const res = await (client.api.chat[':matchId'].messages.$post as any)({
                param: { matchId: matchId as string },
                json: { content: newMessage }
            })
            if (!res.ok) throw new Error('Failed to send')
            return res.json()
        },
        onSuccess: () => {
            setNewMessage('')
            queryClient.invalidateQueries({ queryKey: ['chat', matchId] })
        }
    })

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return (
        <div className="flex flex-row h-full w-full overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="h-16 border-b px-6 flex items-center justify-between bg-background/50 backdrop-blur-sm shrink-0">
                    <h2 className="font-semibold truncate">Chat</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors rounded-xl font-bold"
                        onClick={() => {
                            if (confirm('Delete this conversation entirely?')) {
                                deleteChatMutation.mutate()
                            }
                        }}
                        disabled={deleteChatMutation.isPending}
                    >
                        {deleteChatMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Trash2 className="size-4" />
                        )}
                        Delete Chat
                    </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-50">
                            <Loader2 className="size-6 animate-spin" />
                            <p className="text-sm">Loading history...</p>
                        </div>
                    )}
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
                            <MessageCircle className="size-12" />
                            <div className="text-center">
                                <p className="font-semibold">No messages yet</p>
                                <p className="text-xs">Send a message to start the conversation!</p>
                            </div>
                        </div>
                    )}
                    {messages.map(msg => {
                        const isMe = msg.senderId === me?.id
                        return (
                            <div key={msg.id} className={cn(
                                "flex flex-col max-w-[85%] space-y-1",
                                isMe ? "ml-auto items-end" : "mr-auto items-start"
                            )}>
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-sm border transition-all",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10"
                                        : "bg-card rounded-tl-none shadow-sm"
                                )}>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground opacity-60 px-1">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 border-t bg-background/50 backdrop-blur-sm">
                    <div className="flex gap-2 max-w-4xl mx-auto">
                        <Input
                            placeholder="Type a message..."
                            className="h-11 rounded-full px-6 bg-muted/20 border-none focus-visible:ring-primary/50"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessageMutation.mutate()}
                        />
                        <Button
                            size="icon"
                            className="size-11 rounded-full shrink-0"
                            onClick={() => sendMessageMutation.mutate()}
                            disabled={sendMessageMutation.isPending || !newMessage.trim()}
                        >
                            <Send className="size-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
