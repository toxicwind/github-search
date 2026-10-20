'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Command } from 'cmdk'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { getBuiltInActions, getRecentSearches } from './actions'
import { CommandAction } from './types'
import './command-palette.css'

export function CommandPalette() {
    const { isOpen, setIsOpen } = useCommandPalette()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [search, setSearch] = useState('')

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const handleNavigate = (path: string) => {
        router.push(path)
        setIsOpen(false)
    }

    const handleToggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
        setIsOpen(false)
    }

    const builtInActions = getBuiltInActions({
        onNavigate: handleNavigate,
        onToggleTheme: handleToggleTheme,
        currentTheme: theme,
    })

    const recentSearches = getRecentSearches()

    // Group commands by category
    const navigationCommands = builtInActions.filter((cmd) => cmd.category === 'navigation')
    const searchCommands = builtInActions.filter((cmd) => cmd.category === 'search')
    const actionCommands = builtInActions.filter((cmd) => cmd.category === 'actions')

    return (
        <Command.Dialog
            open={isOpen}
            onOpenChange={setIsOpen}
            label="Global Command Menu"
            loop
        >
            <Command.Input
                placeholder="Type a command or search..."
                value={search}
                onValueChange={setSearch}
            />
            <Command.List>
                <Command.Empty>No commands found.</Command.Empty>

                {recentSearches.length > 0 && (
                    <Command.Group heading="Recent Searches">
                        {recentSearches.map((cmd) => (
                            <CommandItem key={cmd.id} command={cmd} />
                        ))}
                    </Command.Group>
                )}

                <Command.Group heading="Navigation">
                    {navigationCommands.map((cmd) => (
                        <CommandItem key={cmd.id} command={cmd} />
                    ))}
                </Command.Group>

                <Command.Separator />

                <Command.Group heading="Search">
                    {searchCommands.map((cmd) => (
                        <CommandItem key={cmd.id} command={cmd} />
                    ))}
                </Command.Group>

                <Command.Separator />

                <Command.Group heading="Actions">
                    {actionCommands.map((cmd) => (
                        <CommandItem key={cmd.id} command={cmd} />
                    ))}
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    )
}

function CommandItem({ command }: { command: CommandAction }) {
    const Icon = command.icon as any

    return (
        <Command.Item
            value={command.label}
            keywords={command.keywords}
            onSelect={() => command.onSelect()}
        >
            {Icon && <Icon />}
            <span>{command.label}</span>
            {command.shortcut && <kbd className="cmdk-shortcut">{command.shortcut}</kbd>}
        </Command.Item>
    )
}
