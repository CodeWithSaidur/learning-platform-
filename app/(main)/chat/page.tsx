'use client'

import { MessageCircle } from 'lucide-react'

export default function ChatEmptyPage() {
    return (
        <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground h-full">
            <br />
            <div className="text-center">
                <MessageCircle className="size-12 mx-auto mb-4 opacity-20" />
                <p>Select a conversation to start chatting</p>
            </div>
        </div>
    )
}
