'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'motion/react'
import { LogOut, User, Loader2, Check, Camera } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function UserProfileDropdown() {
    const { user } = useUser()
    const { signOut } = useClerk()
    const [isOpen, setIsOpen] = useState(false)
    const [firstName, setFirstName] = useState(user?.firstName || '')
    const [lastName, setLastName] = useState(user?.lastName || '')
    const [isUpdating, setIsUpdating] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '')
            setLastName(user.lastName || '')
        }
    }, [user])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleUpdate = async () => {
        if (!user) return
        setIsUpdating(true)
        try {
            await user.update({
                firstName,
                lastName
            })
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 2000)
        } catch (error) {
            console.error('Error updating profile:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setIsUpdating(true)
        try {
            await user.setProfileImage({ file })
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 2000)
        } catch (error) {
            console.error('Error uploading image:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    if (!user) return null

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center group transition-transform hover:scale-105 active:scale-95"
            >
                <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-all">
                    <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.firstName?.charAt(0) || user.emailAddresses[0].emailAddress.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10, x: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, x: -10 }}
                        className="absolute right-0 mt-3 w-72 origin-top-right overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 z-50 p-6"
                    >
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-4 border-b pb-4">
                                <div
                                    className="relative group/avatar cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Avatar className="h-14 w-14 border-2 border-muted hover:border-primary transition-all">
                                        <AvatarImage src={user.imageUrl} />
                                        <AvatarFallback>{user.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                        <Camera className="size-5 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold truncate text-lg">{user.fullName}</span>
                                    <span className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                        First Name
                                    </label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="First Name"
                                        className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/50 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                        Last Name
                                    </label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Last Name"
                                        className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/50 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <Button
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="rounded-xl h-11 font-bold gap-2 relative overflow-hidden group shadow-lg shadow-primary/20"
                                >
                                    {isUpdating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : showSuccess ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Check className="h-4 w-4 text-white" />
                                            Updated
                                        </motion.div>
                                    ) : (
                                        <>Update Profile</>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => signOut({ redirectUrl: '/' })}
                                    className="rounded-xl h-11 font-bold gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
