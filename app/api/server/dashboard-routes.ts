import { User, Community, CommunityMember, Match, Conversation, Message } from '@/db/schema'
import { Hono } from 'hono'

type Variables = {
    userId: string
}

const dashboardApp = new Hono<{ Variables: Variables }>()

    // Get Current User Info
    .get('/me', async c => {
        const userId = c.get('userId')
        const user = await User.findById(userId)
        if (!user) return c.json({ error: 'User not found' }, 404)
        return c.json({
            ...user.toObject(),
            id: user._id.toString()
        })
    })

    // Get User Stats
    .get('/stats', async c => {
        const userId = c.get('userId')

        // Count communities joined
        const communityCount = await CommunityMember.countDocuments({ userId })

        // Count active matches (conversations)
        const matchesCount = await Match.countDocuments({
            $or: [{ user1Id: userId }, { user2Id: userId }]
        })

        return c.json({
            communities: communityCount,
            activeMatches: matchesCount
        })
    })

    // Get Recent Chats (Conversations)
    .get('/recent', async c => {
        const userId = c.get('userId')

        // 1. Get matches with populated community info
        const userMatches = await Match.find({
            $or: [{ user1Id: userId }, { user2Id: userId }]
        }).populate('communityId').limit(5)

        // 2. Enrich with other user info and last message
        const recentChats = await Promise.all(
            userMatches.map(async (matchDoc: any) => {
                try {
                    const otherUserId = matchDoc.user1Id.toString() === userId ? matchDoc.user2Id : matchDoc.user1Id
                    const otherUser = await User.findById(otherUserId)

                    // Find conversation for this match
                    const conversation = await Conversation.findOne({ matchId: matchDoc._id })

                    let lastMessage = null
                    if (conversation) {
                        lastMessage = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 })
                    }

                    return {
                        matchId: matchDoc._id,
                        otherUser: {
                            id: otherUser?._id,
                            name: otherUser?.name,
                            imageUrl: otherUser?.imageUrl
                        },
                        communityName: matchDoc.communityId?.name || "Unknown Community",
                        lastMessage: lastMessage ? lastMessage.content : "No messages yet",
                        lastMessageAt: lastMessage ? lastMessage.createdAt : null
                    }
                } catch (err) {
                    console.error('[Dashboard Recent Error]', err)
                    return null
                }
            })
        )

        // Filter out nulls
        const filteredChats = recentChats.filter(chat => chat !== null)


        // Sort by last message date (descending)
        filteredChats.sort((a: any, b: any) => {
            const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
            const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
            return dateB - dateA
        })

        return c.json(filteredChats)
    })


export { dashboardApp }

