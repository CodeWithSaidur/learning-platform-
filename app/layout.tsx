import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import Headerwraper from '@/components/layout/header-wrapper'
import FooterWrapper from '@/components/layout/footer-wrapper'
import BackgroundGradient from '@/components/landing/background-gradient'
import { QueryProvider } from '@/components/provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          suppressHydrationWarning
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <QueryProvider>
            <BackgroundGradient>
              <div className="flex flex-col min-h-screen">
                <Headerwraper />
                <main className="flex-1">
                  {children}
                </main>
                <FooterWrapper />
              </div>
            </BackgroundGradient>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
