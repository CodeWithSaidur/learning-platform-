'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { client } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, Loader2, Lock, Mail, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'

export default function AdminLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const { user, isLoaded: userLoaded } = useUser()

    // Auto-redirect if already admin
    useEffect(() => {
        if (userLoaded && user) {
            const role = (user?.publicMetadata as any)?.role?.toLowerCase()
            const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
            if (role === 'admin' || email === 'sabedbarbhuiya3@gmail.com') {
                router.push('/admin')
            }
        }
    }, [user, userLoaded, router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            // @ts-ignore - types might not be updated yet
            const res = await client.api.admin.login.$post({
                json: { email, password }
            })

            if (res.ok) {
                const data = await res.json()
                if (data.ok) {
                    localStorage.setItem('admin_auth', 'true')
                    localStorage.setItem('admin_key', password)
                    router.push('/admin')
                } else {
                    setError('Access denied. This portal is restricted to system administrators.')
                }
            } else {
                setError('Invalid administrator credentials.')
            }
        } catch (err) {
            setError('System error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#fef6e2]">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/70 backdrop-blur-2xl">
                    <CardHeader className="p-8 pt-12 text-center space-y-4">
                        <div className="size-16 bg-primary rounded-[1.5rem] flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                            <ShieldAlert className="size-8 text-primary-foreground" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-extrabold tracking-tight">Admin Portal</CardTitle>
                            <CardDescription className="text-base font-medium">Platform Management Authentication</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pb-12">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Mail className="size-5" />
                                    </div>
                                    <Input
                                        type="email"
                                        placeholder="Admin Email"
                                        className="h-14 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/50 text-base"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Lock className="size-5" />
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="Admin Password"
                                        className="h-14 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/50 text-base"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive text-sm font-bold rounded-r-xl"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 group overflow-hidden"
                                disabled={isLoading}
                            >
                                <span className="flex items-center gap-2">
                                    {isLoading ? (
                                        <Loader2 className="size-5 animate-spin" />
                                    ) : (
                                        <>
                                            Secure Access
                                            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </Button>

                            <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] pt-4">
                                Restricted Access Area
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
