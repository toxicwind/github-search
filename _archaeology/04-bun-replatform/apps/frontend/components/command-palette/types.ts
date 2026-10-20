import React, { ComponentType } from 'react'

export interface CommandAction {
    id: string
    label: string
    icon?: ComponentType<any>
    keywords?: string[]
    onSelect: () => void
    category?: 'navigation' | 'search' | 'actions' | 'recent'
    shortcut?: string
}


export interface CommandGroup {
    heading: string
    items: CommandAction[]
}

export interface CommandContextType {
    commands: CommandAction[]
    registerCommand: (command: CommandAction) => void
    unregisterCommand: (id: string) => void
}
