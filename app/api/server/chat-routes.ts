import { User, Match, Conversation, Message, ConversationSummary } from '@/db/schema'
import { Hono } from 'hono'
import { pusherServer } from '@/lib/pusher'

type Variables = {
    userId: string
}

const chatApp = new Hono<{ Variables: Variables }>()

    // 1. Get All Conversations (Active Matches)
    .get('/', async c => {
        const userId = c.get('userId')

        // Find all matches for this user
        const userMatches = await Match.find({
            $or: [{ user1Id: userId }, { user2Id: userId }]
        })

        const enrichedMatches = await Promise.all(userMatches.map(async (matchDoc: any) => {
            const partnerId = matchDoc.user1Id.toString() === userId ? matchDoc.user2Id : matchDoc.user1Id
            const partner = await User.findById(partnerId)

            const conversation = await Conversation.findOne({ matchId: matchDoc._id })
            let lastMessage = null
            if (conversation) {
                lastMessage = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 })
            }

            return {
                matchId: matchDoc._id,
                partnerId: partner?._id,
                partnerName: partner?.name,
                partnerImage: partner?.imageUrl,
                lastMessage: lastMessage ? lastMessage.content : null,
                lastMessageAt: lastMessage ? lastMessage.createdAt : null
            }
        }))

        return c.json(enrichedMatches)
    })

    // 2. Get Messages for a specific Match/Conversation
    .get('/:matchId/messages', async c => {
        const matchId = c.req.param('matchId')
        const userId = c.get('userId')

        // Ensure conversation record exists for this match
        let conversation = await Conversation.findOne({ matchId })

        if (!conversation) {
            // Create it if it doesn't exist (lazy creation)
            const match = await Match.findById(matchId)
            if (!match || (match.user1Id.toString() !== userId && match.user2Id.toString() !== userId)) {
                return c.json({ error: 'Unauthorized or Match not found' }, 401)
            }

            conversation = await Conversation.create({
                matchId
            })
        }

        const allMessages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 })

        return c.json({ conversation, messages: allMessages })
    })

    // 3. Send Message
    .post('/:matchId/messages', async c => {
        const matchId = c.req.param('matchId')
        const userId = c.get('userId')
        const { content } = await c.req.json<{ content: string }>()

        if (!content) return c.json({ error: 'Content required' }, 400)

        // Get or create conversation
        let conversation = await Conversation.findOne({ matchId })

        if (!conversation) {
            const match = await Match.findById(matchId)
            if (!match || (match.user1Id.toString() !== userId && match.user2Id.toString() !== userId)) {
                return c.json({ error: 'Unauthorized' }, 401)
            }
            conversation = await Conversation.create({ matchId })
        }

        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId: userId,
            content
        })

        // Update last message timestamp
        await Conversation.findByIdAndUpdate(conversation._id, { lastMessageAt: new Date() })

        // Trigger Pusher event
        try {
            await pusherServer.trigger(
                `chat-${conversation._id.toString()}`,
                'new-message',
                newMessage.toJSON()
            )
            console.log(`[Pusher] Triggered new-message on channel: chat-${conversation._id.toString()}`)
        } catch (e) {
            console.error('[Pusher] Trigger failed:', e)
        }

        return c.json(newMessage)
    })

    // 4. Delete Conversation
    .delete('/:matchId', async c => {
        const matchId = c.req.param('matchId')
        const userId = c.get('userId')

        // Verify membership and ownership
        const match = await Match.findById(matchId)
        if (!match || (match.user1Id.toString() !== userId && match.user2Id.toString() !== userId)) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        const conversation = await Conversation.findOne({ matchId })

        if (conversation) {
            // Delete associated data
            await Message.deleteMany({ conversationId: conversation._id })
            await ConversationSummary.deleteMany({ conversationId: conversation._id })
            await Conversation.findByIdAndDelete(conversation._id)
        }

        await Match.findByIdAndDelete(matchId)

        return c.json({ success: true })
    })

export { chatApp }

