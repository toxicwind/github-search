import { Home, Search, Code, FileCode, Users, Moon, Sun, Copy, Trash2 } from 'lucide-react'
import { CommandAction } from '../types'

export function getBuiltInActions(options: {
    onNavigate: (path: string) => void
    onToggleTheme?: () => void
    currentTheme?: string
}): CommandAction[] {
    const { onNavigate, onToggleTheme, currentTheme } = options

    return [
        // Navigation
        {
            id: 'nav-home',
            label: 'Go to Home',
            icon: Home,
            keywords: ['home', 'main', 'index'],
            category: 'navigation',
            onSelect: () => onNavigate('/'),
        },
        {
            id: 'nav-search',
            label: 'Go to Search',
            icon: Search,
            keywords: ['search', 'find'],
            category: 'navigation',
            onSelect: () => onNavigate('/search'),
        },

        // Search actions
        {
            id: 'search-repos',
            label: 'Search Repositories',
            icon: Code,
            keywords: ['repo', 'repository', 'project'],
            category: 'search',
            onSelect: () => {
                onNavigate('/')
                // Focus will be handled by the search component
            },
        },
        {
            id: 'search-code',
            label: 'Search Code',
            icon: FileCode,
            keywords: ['code', 'file', 'function'],
            category: 'search',
            onSelect: () => onNavigate('/?category=code'),
        },
        {
            id: 'search-users',
            label: 'Search Users',
            icon: Users,
            keywords: ['user', 'developer', 'profile'],
            category: 'search',
            onSelect: () => onNavigate('/?category=users'),
        },

        // Actions
        {
            id: 'action-toggle-theme',
            label: currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
            icon: currentTheme === 'dark' ? Sun : Moon,
            keywords: ['theme', 'dark', 'light', 'mode'],
            category: 'actions',
            onSelect: () => onToggleTheme?.(),
        },
        {
            id: 'action-copy-url',
            label: 'Copy Current URL',
            icon: Copy,
            keywords: ['copy', 'url', 'link', 'share'],
            category: 'actions',
            onSelect: () => {
                navigator.clipboard.writeText(window.location.href)
            },
        },
        {
            id: 'action-clear-cache',
            label: 'Clear Search Cache',
            icon: Trash2,
            keywords: ['clear', 'cache', 'reset', 'clean'],
            category: 'actions',
            onSelect: () => {
                localStorage.removeItem('recent-searches')
                window.location.reload()
            },
        },
    ]
}

export function getRecentSearches(): CommandAction[] {
    const recent = localStorage.getItem('recent-searches')
    if (!recent) return []

    try {
        const searches = JSON.parse(recent) as string[]
        return searches.slice(0, 5).map((search, index) => ({
            id: `recent-${index}`,
            label: search,
            icon: Search,
            category: 'recent' as const,
            onSelect: () => {
                window.location.href = `/?q=${encodeURIComponent(search)}`
            },
        }))
    } catch {
        return []
    }
}
