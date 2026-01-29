import { db } from '@/db'
import { communities, communityMembers, users } from '@/db/schema'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { eq } from 'drizzle-orm'
import { communitiesApp } from '../server/community-routes'
import { dashboardApp } from '../server/dashboard-routes'
import { chatApp } from '../server/chat-routes'
import { adminApp } from '../server/admin-routes'

type Variables = {
  userId: string
  role?: string
}

const app = new Hono<{ Variables: Variables }>().basePath('/api')

app.onError((err, c) => {
  console.error(err)
  return c.json({ err: 'Internal Server Error' }, 500)
})

// Middleware
app.use('/*', async (c, next) => {
  const publicRoutes = ['/api/communities/all']
  if (publicRoutes.includes(c.req.path)) {
    return next()
  }

  // prevent unauth user to access communities
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  // Get or Create DB User
  let [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      console.error(`[API Middleware] Clerk user not found for ID: ${userId}`)
      throw new HTTPException(404, { message: 'User not found in Clerk' })
    }

    [user] = await db.insert(users).values({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Learner',
      imageUrl: clerkUser.imageUrl
    }).returning()
    console.log(`[API Middleware] Created new DB user ${user.id} for email ${user.email}`)
  }

  // Extract role from session claims
  let role = (sessionClaims?.metadata as any)?.role ||
    (sessionClaims?.publicMetadata as any)?.role ||
    (sessionClaims as any)?.role ||
    null

  // Fallback: If the email is the designated admin email, grant admin role
  if (user?.email?.toLowerCase() === 'sabedbarbhuiya3@gmail.com') {
    role = 'admin'
    console.log(`[API Middleware] Granted internal 'admin' role based on email: ${user.email}`)
  }

  console.log(`[API Middleware] Processing ${c.req.method} ${c.req.path} for Clerk user ${userId} | Email: ${user?.email} | Role: ${role}`)
  c.set('userId', user.id)
  c.set('role', role)
  return await next()
})

const routes = app
  .route('/communities', communitiesApp)
  .route('/dashboard', dashboardApp)
  .route('/chat', chatApp)
  .route('/admin', adminApp)

export type AppType = typeof routes

export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
