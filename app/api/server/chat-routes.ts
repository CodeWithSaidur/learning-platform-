import { db } from '@/db'
import { conversations, matches, messages, users, conversationSummaries } from '@/db/schema'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { generateConversationSummary } from '@/lib/ai/summary-service'
import { pusherServer } from '@/lib/pusher'

type Variables = {
    userId: string
}

const chatApp = new Hono<{ Variables: Variables }>()

    // 1. Get All Conversations (Active Matches)
    .get('/', async c => {
        const userId = c.get('userId')

        // Find all matches for this user where a conversation might exist
        // Or simply listing all matches that are 'accepted' (if we had that status logic fully working)
        // For now, let's list all matches the user is part of.
        // And ideally join with the latest message if it exists.

        const userMatches = await db
            .select({
                matchId: matches.id,
                partnerId: sql<string>`CASE WHEN ${matches.user1Id} = ${userId} THEN ${matches.user2Id} ELSE ${matches.user1Id} END`,
                partnerName: users.name,
                partnerImage: users.imageUrl,
                lastMessage: sql<string>`(SELECT content FROM ${messages} WHERE ${messages.conversationId} = (SELECT id FROM ${conversations} WHERE ${conversations.matchId} = ${matches.id}) ORDER BY ${messages.createdAt} DESC LIMIT 1)`,
                lastMessageAt: sql<string>`(SELECT created_at FROM ${messages} WHERE ${messages.conversationId} = (SELECT id FROM ${conversations} WHERE ${conversations.matchId} = ${matches.id}) ORDER BY ${messages.createdAt} DESC LIMIT 1)`
            })
            .from(matches)
            .innerJoin(users, or(
                and(eq(matches.user1Id, userId), eq(users.id, matches.user2Id)),
                and(eq(matches.user2Id, userId), eq(users.id, matches.user1Id))
            ))
            .where(
                or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
            )

        return c.json(userMatches)
    })

    // 2. Get Messages for a specific Match/Conversation
    .get('/:matchId/messages', async c => {
        const matchId = c.req.param('matchId')
        const userId = c.get('userId')

        // Ensure conversation record exists for this match
        let [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.matchId, matchId))
            .limit(1)

        if (!conversation) {
            // Create it if it doesn't exist (lazy creation)
            // First verify user is part of match
            const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1)
            if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                return c.json({ error: 'Unauthorized or Match not found' }, 401)
            }

            [conversation] = await db.insert(conversations).values({
                matchId
            }).returning()
        }

        const allMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conversation.id))
            .orderBy(messages.createdAt)

        return c.json({ conversation, messages: allMessages })
    })

    // 3. Send Message
    .post('/:matchId/messages', async c => {
        const matchId = c.req.param('matchId')
        const userId = c.get('userId')
        const { content } = await c.req.json<{ content: string }>()

        if (!content) return c.json({ error: 'Content required' }, 400)

        // Get or create conversation (reuse logic or abstract it)
        let [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.matchId, matchId))
            .limit(1)

        if (!conversation) {
            const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1)
            if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                return c.json({ error: 'Unauthorized' }, 401)
            }
            [conversation] = await db.insert(conversations).values({ matchId }).returning()
        }

        const [newMessage] = await db.insert(messages).values({
            conversationId: conversation.id,
            senderId: userId,
            content
        }).returning()

        // Update last message timestamp
        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversation.id))

        // Trigger Pusher event
        try {
            await pusherServer.trigger(`chat-${conversation.id}`, 'new-message', newMessage)
        } catch (e) {
            console.error('Pusher trigger failed:', e)
        }

        return c.json(newMessage)
    })

    // 4. Delete Conversation
    .delete('/:matchId', async c => {
        const matchId = c.req.param('matchId')
        const userId = c.get('userId')

        // Verify membership and ownership
        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1)
        if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.matchId, matchId))
            .limit(1)

        if (conversation) {
            // Delete associated data
            await db.delete(messages).where(eq(messages.conversationId, conversation.id))
            await db.delete(conversationSummaries).where(eq(conversationSummaries.conversationId, conversation.id))
            await db.delete(conversations).where(eq(conversations.id, conversation.id))
        }

        await db.delete(matches).where(eq(matches.id, matchId))

        return c.json({ success: true })
    })

export { chatApp }
