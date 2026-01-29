import { db } from '@/db'
import { communities, users, communityMembers, learningGoals, matches, conversations, messages, conversationSummaries } from '@/db/schema'
import { eq, desc, inArray, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

type Variables = {
    userId: string
    role?: string
}

const adminApp = new Hono<{ Variables: Variables }>()
    // Public login endpoint for admin portal
    .post('/login', async c => {
        const { email, password } = await c.req.json<{ email: string, password?: string }>()

        // For now, we validate against the hardcoded admin email
        // and check if it matches the designated administrator
        if (email?.toLowerCase() === 'sabedbarbhuiya3@gmail.com') {
            return c.json({ ok: true })
        }

        return c.json({ ok: false, message: 'Invalid credentials' }, 401)
    })

    // Middleware to protect all other admin routes
    .use('/*', async (c, next) => {
        const userId = c.get('userId')
        const clerkRole = c.get('role')
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

        const isRoleAdmin = clerkRole?.toLowerCase() === 'admin'
        const isEmailAdmin = user?.email?.toLowerCase() === 'sabedbarbhuiya3@gmail.com'

        console.log('[Clerk Admin Auth Check]', {
            dbUserId: userId,
            clerkRole: clerkRole,
            isRoleAdmin,
            isEmailAdmin,
            foundUser: user ? { id: user.id, email: user.email } : null
        })

        if (!isRoleAdmin && !isEmailAdmin) {
            return c.json({
                error: 'Forbidden',
                message: `Admin access denied. Logged in as: ${user?.email || 'Unknown'}. Required: Clerk Admin role or Administrator Email.`
            }, 403)
        }
        return next()
    })

    // Get all communities
    .get('/communities', async c => {
        const allCommunities = await db
            .select()
            .from(communities)
            .orderBy(desc(communities.createdAt))
        return c.json(allCommunities)
    })

    // Update community
    .put('/communities/:id', async c => {
        const id = c.req.param('id')
        const { name, description } = await c.req.json<{ name: string, description: string }>()
        await db.update(communities)
            .set({ name, description, updatedAt: new Date() })
            .where(eq(communities.id, id))
        return c.json({ success: true })
    })

    // Delete community
    .delete('/communities/:id', async c => {
        const id = c.req.param('id')

        // Manual Cascade Deletion
        // 1. Find all matches in this community
        const communityMatches = await db.select().from(matches).where(eq(matches.communityId, id))
        const matchIds = communityMatches.map(m => m.id)

        if (matchIds.length > 0) {
            // 2. Find conversations
            const communityConversations = await db.select().from(conversations).where(inArray(conversations.matchId, matchIds))
            const convIds = communityConversations.map(c => c.id)

            if (convIds.length > 0) {
                // 3. Delete messages and summaries
                await db.delete(messages).where(inArray(messages.conversationId, convIds))
                await db.delete(conversationSummaries).where(inArray(conversationSummaries.conversationId, convIds))
                // 4. Delete conversations
                await db.delete(conversations).where(inArray(conversations.id, convIds))
            }
            // 5. Delete matches
            await db.delete(matches).where(inArray(matches.id, matchIds))
        }

        // 6. Delete learning goals
        await db.delete(learningGoals).where(eq(learningGoals.communityId, id))
        // 7. Delete memberships
        await db.delete(communityMembers).where(eq(communityMembers.communityId, id))
        // 8. Delete community
        await db.delete(communities).where(eq(communities.id, id))

        return c.json({ success: true })
    })

    // Get all users
    .get('/users', async c => {
        const allUsers = await db
            .select()
            .from(users)
            .orderBy(desc(users.createdAt))
        return c.json(allUsers)
    })

    // Delete user (and their entire footprint)
    .delete('/users/:id', async c => {
        const id = c.req.param('id')

        // 1. Delete messages sent by user
        await db.delete(messages).where(eq(messages.senderId, id))

        // 2. Delete matches user participated in
        const userMatches = await db.select().from(matches).where(or(eq(matches.user1Id, id), eq(matches.user2Id, id)))
        const matchIds = userMatches.map(m => m.id)

        if (matchIds.length > 0) {
            const userConversations = await db.select().from(conversations).where(inArray(conversations.matchId, matchIds))
            const convIds = userConversations.map(c => c.id)
            if (convIds.length > 0) {
                await db.delete(messages).where(inArray(messages.conversationId, convIds))
                await db.delete(conversationSummaries).where(inArray(conversationSummaries.conversationId, convIds))
                await db.delete(conversations).where(inArray(conversations.id, convIds))
            }
            await db.delete(matches).where(inArray(matches.id, matchIds))
        }

        // 3. Delete user's learning goals and memberships
        await db.delete(learningGoals).where(eq(learningGoals.userId, id))
        await db.delete(communityMembers).where(eq(communityMembers.userId, id))

        // 4. Finally delete the user
        await db.delete(users).where(eq(users.id, id))

        return c.json({ success: true })
    })

export { adminApp }
