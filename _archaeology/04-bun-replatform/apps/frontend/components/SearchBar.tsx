import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { slideIn } from '../lib/animations';
import { Search, X, Command } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    isLoading?: boolean;
    searchTime?: number | null;
}

export function SearchBar({
    value,
    onChange,
    onClear,
    isLoading = false,
    searchTime = null,
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === '/' &&
                !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
            ) {
                e.preventDefault();
                inputRef.current?.focus();
            } else if (e.key === 'Escape' && isFocused) {
                e.preventDefault();
                inputRef.current?.blur();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFocused]);

    return (
        <div className="w-full relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-text-muted">
                <Search size={16} />
            </div>

            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search or jump to..."
                className={`
                    w-full pl-10 pr-12 py-1.5
                    bg-cyber-bg border rounded-md
                    text-github-text text-sm placeholder-cyber-text-muted
                    transition-all duration-200
                    ${isFocused
                        ? 'border-cyber-accent bg-cyber-bg shadow-[0_0_0_3px_rgba(47,129,247,0.3)]'
                        : 'border-cyber-border hover:border-cyber-border-bright'
                    }
                    focus:outline-none
                `}
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {value && !isLoading && (
                    <button
                        onClick={onClear}
                        className="text-cyber-text-muted hover:text-cyber-text p-1"
                    >
                        <X size={14} />
                    </button>
                )}

                {isLoading && (
                    <div className="w-4 h-4 border-2 border-cyber-accent border-t-transparent rounded-full animate-spin" />
                )}

                {!value && !isFocused && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 border border-cyber-border rounded bg-cyber-bg-tertiary text-[10px] text-cyber-text-muted font-mono">
                        <Command size={10} />
                        <span>/</span>
                    </div>
                )}
            </div>

            {searchTime !== null && isFocused && (
                <div className="absolute top-full left-0 mt-2 bg-cyber-bg-secondary border border-cyber-border p-2 rounded-md shadow-2xl text-[10px] text-cyber-text-muted font-mono z-[60]">
                    LATENCY: {searchTime.toFixed(0)}ms
                </div>
            )}
        </div>
    );
}
