import { AppType } from '@/app/api/[[...route]]/route'
import { hc } from 'hono/client'


const getBaseUrl = () => {
    if (typeof window !== 'undefined') return window.location.origin
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return 'http://localhost:3000'
}

export const client = hc<AppType>(getBaseUrl())
