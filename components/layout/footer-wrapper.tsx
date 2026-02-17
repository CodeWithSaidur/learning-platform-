'use client'

import { usePathname } from 'next/navigation'
import Footer from './footer'

export default function FooterWrapper() {
    const pathname = usePathname()

    // Hide footer on chat and admin pages to prevent layout conflicts
    const hideFooter = pathname?.startsWith('/chat') || pathname?.startsWith('/admin')

    if (hideFooter) return null

    return <Footer />
}
