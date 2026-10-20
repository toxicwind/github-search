'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CommandAction, CommandContextType } from './types'

const CommandContext = createContext<CommandContextType | undefined>(undefined)

export function CommandProvider({ children }: { children: ReactNode }) {
    const [commands, setCommands] = useState<CommandAction[]>([])

    const registerCommand = useCallback((command: CommandAction) => {
        setCommands((prev) => {
            // Avoid duplicates
            const exists = prev.find((cmd) => cmd.id === command.id)
            if (exists) return prev
            return [...prev, command]
        })
    }, [])

    const unregisterCommand = useCallback((id: string) => {
        setCommands((prev) => prev.filter((cmd) => cmd.id !== id))
    }, [])

    return (
        <CommandContext.Provider value={{ commands, registerCommand, unregisterCommand }}>
            {children}
        </CommandContext.Provider>
    )
}

export function useCommands() {
    const context = useContext(CommandContext)
    if (context === undefined) {
        throw new Error('useCommands must be used within a CommandProvider')
    }
    return context
}
