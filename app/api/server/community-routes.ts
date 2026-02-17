import { User, Community, CommunityMember, LearningGoal, Match } from '@/db/schema'
import { Hono } from 'hono'
import { findMatches } from '@/lib/ai/matching-service'

type Variables = {
  userId: string
  role?: string
}

// Main communities app
const communitiesApp = new Hono<{ Variables: Variables }>()
  .get('/all', async c => {
    const allCommu = await Community.find()
    const mapped = allCommu.map((com: any) => ({
      ...com.toObject(),
      id: com._id.toString()
    }))
    return c.json(mapped)
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

    const newCommunity = await Community.create({
      name,
      description,
      imageUrl,
      createdBy: userId
    })

    // Auto-join the creator
    await CommunityMember.create({
      userId,
      communityId: newCommunity._id
    })

    return c.json(newCommunity)
  })
  .get('/', async c => {
    const clerkID = c.get('userId')
    const memberships = await CommunityMember.find({ userId: clerkID }).populate('communityId')
    const userCommunityes = memberships.map((m: any) => {
      const com = m.communityId;
      if (!com) return null;
      return {
        ...com.toObject(),
        id: com._id.toString()
      }
    }).filter(Boolean)

    return c.json(userCommunityes)
  })

// Nested app for specific community operations
const communityDetailApp = new Hono<{ Variables: Variables }>()
  .get('/', async c => {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'ID is missing' }, 400)

    const community = await Community.findById(id)

    if (!community) {
      return c.json({ error: 'Community not found' }, 404)
    }
    return c.json({
      ...community.toObject(),
      id: community._id.toString()
    })
  })
  .post('/join', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId) return c.json({ error: 'Community ID required' }, 400)
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)

    // Verify community exists
    const community = await Community.findById(communityId)

    if (!community) {
      return c.json({ error: 'Community not found' }, 404)
    }

    await CommunityMember.updateOne(
      { userId, communityId },
      { $setOnInsert: { userId, communityId, joinedAt: new Date() } },
      { upsert: true }
    )

    return c.json({ message: 'Joined successfully' })
  })
  .post('/leave', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    await CommunityMember.deleteOne({ userId, communityId })

    return c.json({ message: 'Left community successfully' })
  })
  .get('/membership', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')
    if (!communityId || !userId) return c.json({ isMember: false })

    const membership = await CommunityMember.findOne({ communityId, userId })

    return c.json({ isMember: !!membership })
  })
  .get('/goals', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    const goals = await LearningGoal.find({ communityId, userId })

    return c.json(goals)
  })
  .post('/goals', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')
    const { title } = await c.req.json<{ title: string }>()

    if (!title) return c.json({ error: 'Title required' }, 400)
    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    const goal = await LearningGoal.create({
      userId,
      communityId,
      title
    })

    return c.json(goal)
  })
  .get('/members', async c => {
    const communityId = c.req.param('id')
    if (!communityId) return c.json({ error: 'Community ID missing' }, 400)

    const userId = c.get('userId')
    const memberships = await CommunityMember.find({ communityId, userId: { $ne: userId } }).populate('userId')
    const members = memberships.map(m => {
      const user = m.userId as any;
      return {
        id: user._id,
        name: user.name,
        imageUrl: user.imageUrl,
        joinedAt: m.joinedAt
      }
    })

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
    const existingMatch = await Match.findOne({
      communityId,
      user1Id: u1,
      user2Id: u2
    })

    if (existingMatch) {
      return c.json({ matchId: existingMatch._id })
    }

    // Create a new match record
    const newMatch = await Match.create({
      user1Id: u1,
      user2Id: u2,
      communityId: communityId,
      status: 'accepted'
    })

    return c.json({ matchId: newMatch._id })
  })
  .post('/match', async c => {
    const communityId = c.req.param('id')
    const userId = c.get('userId')

    if (!communityId || !userId) return c.json({ error: 'Invalid request' }, 400)

    // 1. Get current user profile & goals
    const currentUserDoc = await User.findById(userId)
    const currentUserGoals = await LearningGoal.find({ userId })

    const currentUser = {
      id: currentUserDoc?._id,
      name: currentUserDoc?.name,
      goals: currentUserGoals.map(g => g.title)
    }

    // 2. Get candidates in the same community (excluding current user)
    const memberships = await CommunityMember.find({ communityId, userId: { $ne: userId } }).populate('userId')

    // This is inefficient but works for now to translate SQL behavior
    const candidates = await Promise.all(memberships.map(async (m) => {
      const user = m.userId as any;
      const goals = await LearningGoal.find({ userId: user._id })
      return {
        id: user._id,
        name: user.name,
        goals: goals.map(g => g.title)
      }
    }))

    if (!currentUser.id || candidates.length === 0) {
      return c.json({ matches: [] })
    }

    // 3. Call AI Service
    const aiMatches = await findMatches(
      { ...currentUser, goals: currentUser.goals || [] },
      candidates.map(cand => ({ ...cand, goals: cand.goals || [] }))
    )

    // 4. Store High Quality Matches and Return with IDs
    const matchesWithIds = await Promise.all(aiMatches.map(async (match: any) => {
      if (match.matchScore >= 70) {
        const [u1, u2] = [userId, match.userId].sort()

        const matchRecord = await Match.findOneAndUpdate(
          { user1Id: u1, user2Id: u2, communityId },
          { status: 'pending' },
          { upsert: true, new: true }
        )

        return { ...match, matchId: matchRecord._id }
      }
      return { ...match, matchId: null }
    }))

    return c.json({ matches: matchesWithIds })
  })

// Mount the nested app
communitiesApp.route('/:id', communityDetailApp)

export { communitiesApp }
