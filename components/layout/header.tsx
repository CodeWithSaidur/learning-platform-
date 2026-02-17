'use client'
import { useState } from 'react'

import Link from 'next/link'
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs'
import { Trophy, Menu, X, LayoutDashboard, Users, MessageSquare, ShieldCheck, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UserProfileDropdown from './user-profile-dropdown'

type HeaderProps = {
  isPro: boolean
}

export default function Header({ isPro }: HeaderProps) {
  const { user } = useUser()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isAdminRole = (user?.publicMetadata as any)?.role?.toLowerCase() === 'admin'
  const isAdminEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === 'sabedbarbhuiya3@gmail.com'
  const isAdmin = isAdminRole || isAdminEmail

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Communities', href: '/communities', icon: Users },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
  ]

  if (isAdmin) {
    navLinks.push({ name: 'Admin', href: '/admin', icon: ShieldCheck })
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-16 h-auto py-2 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 flex-wrap gap-4">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link
            href={user ? "/dashboard" : "/"}
            aria-label="Home"
            className="flex items-center gap-2 text-xl font-bold tracking-tight transition-all hover:scale-105"
          >
            <span className="text-2xl">🎓</span>
            <span className="hidden sm:inline-block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EduAliens
            </span>
          </Link>

          <SignedIn>
            <nav
              aria-label="Main navigation"
              className="hidden md:flex items-center gap-1 text-sm font-medium"
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 rounded-full transition-all duration-300 hover:text-primary ${isActive ? 'text-primary font-bold bg-primary/5' : 'text-muted-foreground'
                      }`}
                  >
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                      />
                    )}
                  </Link>
                )
              })}
            </nav>
          </SignedIn>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-4">
          <SignedIn>
            <div className="hidden sm:flex items-center gap-3 mr-2">
              {isPro ? (
                <Badge className="gap-1 bg-amber-500 text-black border-none shadow-sm">
                  <Trophy className="h-3 w-3" />
                  Pro
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-medium">Free</Badge>
              )}
            </div>

            <UserProfileDropdown />

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SignedIn>

          <SignedOut>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>

              <Button
                asChild
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95 px-5"
              >
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          </SignedOut>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 top-16 bg-background/60 backdrop-blur-sm z-40"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-16 left-0 right-0 border-b bg-background z-50 overflow-hidden shadow-2xl rounded-b-[2rem]"
            >
              <SignedIn>
                <nav className="flex flex-col p-6 space-y-2">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                    const Icon = link.icon
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${isActive
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'hover:bg-muted font-medium'
                          }`}
                      >
                        <Icon className={`size-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                        <span className="text-lg">{link.name}</span>
                        {isActive && <motion.div layoutId="active-dot" className="ml-auto size-1.5 rounded-full bg-white" />}
                      </Link>
                    )
                  })}

                  <div className="pt-6 mt-4 border-t flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="size-5 text-amber-500" />
                      <span className="text-sm font-bold">Your Plan</span>
                    </div>
                    {isPro ? (
                      <Badge className="bg-amber-500 text-black border-none px-3 py-1 font-bold">PRO</Badge>
                    ) : (
                      <Badge variant="secondary" className="px-3 py-1 font-bold">FREE</Badge>
                    )}
                  </div>
                </nav>
              </SignedIn>

              <SignedOut>
                <div className="p-6 flex flex-col gap-3">
                  <Button asChild variant="outline" className="h-14 rounded-2xl font-bold">
                    <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                  </Button>
                  <Button asChild className="h-14 rounded-2xl font-bold">
                    <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                  </Button>
                </div>
              </SignedOut>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  )
}
