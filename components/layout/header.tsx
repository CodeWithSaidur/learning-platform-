'use client'
import { useState, useEffect } from 'react'

import Link from 'next/link'
import {
  SignedIn,
  SignedOut,
  useUser
} from '@clerk/nextjs'
import { Trophy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UserProfileDropdown from './user-profile-dropdown'

type HeaderProps = {
  isPro: boolean
}

export default function Header({ isPro }: HeaderProps) {
  const { user } = useUser()
  const isAdminRole = (user?.publicMetadata as any)?.role?.toLowerCase() === 'admin'
  const isAdminEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === 'sabedbarbhuiya3@gmail.com'
  const isAdmin = isAdminRole || isAdminEmail

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            aria-label="Home"
            className="text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            👽
          </Link>

          <SignedIn>
            <nav
              aria-label="Main navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium"
            >
              <Link href="/dashboard" className="hover:text-primary">
                Dashboard
              </Link>
              <Link href="/communities" className="hover:text-primary">
                Communities
              </Link>
              <Link href="/chat" className="hover:text-primary">
                Chat
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-primary font-bold">
                  Admin
                </Link>
              )}
            </nav>
          </SignedIn>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <SignedIn>
            {isPro ? (
              <Badge className="gap-1 bg-amber-500 text-black">
                <Trophy className="h-3.5 w-3.5" />
                Pro
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}

            <UserProfileDropdown />
          </SignedIn>

          <SignedOut>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>

              <Button
                asChild
                className="rounded-full bg-amber-500 text-black hover:bg-amber-400"
              >
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          </SignedOut>
        </div>
      </div>
    </header>
  )
}
