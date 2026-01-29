import { db } from '@/db'
import { communities, communityMembers, learningGoals, users, matches } from '@/db/schema'
import { and, eq, ne, sql, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { findMatches } from '@/lib/ai/matching-service'

type Variables = {
  userId: string
  role?: string
}

// Main communities app
const communitiesApp = new Hono<{ Variables: Variables }>()
  .get('/all', async c => {
    const allCommu = await db.select().from(communities)
    return c.json(allCommu)
  })
  .post('/', async c => {
    const userId = c.get('userId')
    const role = c.get('role')
    console.log(`[POST /api/communities] User: ${userId} | Role: ${role}`)

    if (role !== 'admin') {
      return c.json({ error: 'Only administrators can create communities' }, 403)
    }

    const { name, description, imageUrl } = await c.req.json<{ name: string, description?: string, imageUrl?: string }>()

    if (!name) return c.json({ error: 'Name is required' }, 400)

    const [newCommunity] = await db.insert(communities).values({
      name,
      description,
      imageUrl,
      createdById: userId
    }).returning()

    // Auto-join the creator
    await db.insert(communityMembers).values({
      userId,
      communityId: newCommunity.id
    })

    return c.json(newCommunity)
  })
  .get('/', async c => {
    const clerkID = c.get('userId')
    const userCommunityes = await db
      .select({
        id: communities.id,
        name: communities.name,
        description: communities.description,
        imageUrl: communities.imageUrl,
        createdById: communities.createdById,
        createdAt: communities.createdAt,
        updatedAt: communities.updatedAt
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(eq(communityMembers.userId, clerkID))

    return c.json(userCommunityes)
  })

// Nested app for specific community operations
// This will be mounted at /:id
const communityDetailApp = new Hono<{ Variables: Variables }>()
  .get('/', async c => {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'ID is missing' }, 400)

    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, id))
      .limit(1)

    if (!community) {
      return c.json({ error: 'Community not found' }, 404)
    }
    return c.json(community)
  })
  .post('/join', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId) return c.json({ error: 'Community ID required' }, 400)
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)

    // Verify community exists
    if (!communityId) return c.json({ error: 'Community ID missing' }, 400)

    // Verify community exists
    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1)

    if (!community) {
      return c.json({ error: 'Community not found' }, 404)
    }

    await db
      .insert(communityMembers)
      // @ts-ignore - explicitly checking userId/communityId above but TS might still complain about undefined union
      .values({
        userId: userId as string,
        communityId: communityId as string
      })
      .onConflictDoNothing()

    return c.json({ message: 'Joined successfully' })
  })
  .get('/membership', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')
    if (!communityId || !userId) return c.json({ isMember: false })

    const [membership] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, userId)
        )
      )
      .limit(1)

    return c.json({ isMember: !!membership })
  })
  .get('/goals', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    const goals = await db
      .select()
      .from(learningGoals)
      .where(
        and(
          eq(learningGoals.communityId, communityId),
          eq(learningGoals.userId, userId)
        )
      )

    return c.json(goals)
  })
  .post('/goals', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')
    const { title } = await c.req.json<{ title: string }>()

    if (!title) return c.json({ error: 'Title required' }, 400)
    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    const [goal] = await db.insert(learningGoals).values({
      userId: userId as string,
      communityId: communityId as string,
      title
    }).returning()

    return c.json(goal)
  })
  .get('/members', async c => {
    const communityId = c.req.param('id')
    if (!communityId) return c.json({ error: 'Community ID missing' }, 400)

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
        joinedAt: communityMembers.joinedAt
      })
      .from(communityMembers)
      .innerJoin(users, eq(communityMembers.userId, users.id))
      .where(eq(communityMembers.communityId, communityId))

    return c.json(members)
  })
  .post('/members/:targetUserId/connect', async c => {
    const communityId = c.req.param('id')
    const targetUserId = c.req.param('targetUserId')
    const userId = c.get('userId')

    if (!communityId || !targetUserId || !userId) return c.json({ error: 'Invalid' }, 400)
    if (userId === targetUserId) return c.json({ error: 'Cannot connect with self' }, 400)

    const [u1, u2] = [userId, targetUserId].sort()

    // Ensure order for user1Id < user2Id
    const [existingMatch] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.communityId, communityId),
          eq(matches.user1Id, u1),
          eq(matches.user2Id, u2)
        )
      )
      .limit(1)

    if (existingMatch) {
      return c.json({ matchId: existingMatch.id })
    }

    // Create a new match record
    const [newMatch] = await db.insert(matches).values({
      user1Id: u1,
      user2Id: u2,
      communityId: communityId,
      status: 'accepted'
    }).returning()

    return c.json({ matchId: newMatch.id })
  })
  .post('/match', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    // 1. Get current user profile & goals
    const [currentUser] = await db
      .select({
        id: users.id,
        name: users.name,
        goals: sql<string[]>`array_agg(${learningGoals.title})`
      })
      .from(users)
      .leftJoin(learningGoals, eq(learningGoals.userId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id)

    // 2. Get candidates in the same community (excluding current user)
    const candidates = await db
      .select({
        id: users.id,
        name: users.name,
        goals: sql<string[]>`array_agg(${learningGoals.title})`
      })
      .from(users)
      .innerJoin(communityMembers, eq(communityMembers.userId, users.id))
      .leftJoin(learningGoals, eq(learningGoals.userId, users.id))
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          ne(users.id, userId)
        )
      )
      .groupBy(users.id)

    if (!currentUser || candidates.length === 0) {
      return c.json({ matches: [] })
    }

    if (!communityId) return c.json({ error: 'Community ID missing' }, 400)

    // 3. Call AI Service
    const aiMatches = await findMatches(
      { ...currentUser, goals: currentUser.goals || [] },
      candidates.map(cand => ({ ...cand, goals: cand.goals || [] }))
    )

    // 4. Store High Quality Matches and Return with IDs
    const matchesWithIds = await Promise.all(aiMatches.map(async (match: any) => {
      if (match.matchScore >= 70) {
        const [u1, u2] = [userId, match.userId].sort()

        const [inserted] = await db.insert(matches).values({
          user1Id: u1,
          user2Id: u2,
          communityId: communityId as string,
          status: 'pending'
        })
          .onConflictDoUpdate({
            target: [matches.user1Id, matches.user2Id, matches.communityId],
            set: { status: 'pending' }
          })
          .returning()

        let matchId = inserted?.id
        if (!matchId) {
          const [existing] = await db.select().from(matches).where(
            and(
              eq(matches.user1Id, u1),
              eq(matches.user2Id, u2),
              eq(matches.communityId, communityId)
            )
          ).limit(1)
          matchId = existing?.id
        }

        return { ...match, matchId }
      }
      return { ...match, matchId: null }
    }))

    return c.json({ matches: matchesWithIds })
  })

// Mount the nested app
// IMPORTANT: The path parameter must be consistent. Hono uses the route path for client types.
communitiesApp.route('/:id', communityDetailApp)

export { communitiesApp }
