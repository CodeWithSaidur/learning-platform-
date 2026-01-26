import { db } from '@/db'
import { communities, messages } from '@/db/schema'
import { auth } from '@clerk/nextjs/server'
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { HTTPException } from 'hono/http-exception'

type Variables = {
  usdrId: string
}

const app = new Hono<{ Variables: Variables }>().basePath('/api')

app.onError((err, c) => {
  console.error(err)
  return c.json({ err: 'Internal Server Error' }, 500)
})

app.get('/*', async (c, next) => {
  const publicRoute = ['/api/communities/all']
  if (publicRoute.includes(c.req.path)) {
    return next()
  }

  const session = await auth()
  if (!session.userId) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  c.set('usdrId', session.userId)

  return await next()
})

app.get('/communities/all', async c => {
  const allCommu = await db.select().from(communities)
  return c.json(allCommu)
})

export const GET = handle(app)
export const POST = handle(app)
