import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resultCardVariants } from '../lib/animations';
import type { SearchResult, SearchCategory } from '../types/search';
import { SearchPortal } from './SearchPortal';
import {
    Book,
    Code2,
    FileJson,
    GitCommit,
    GitPullRequest,
    Hash,
    Info,
    MessageSquare,
    Package,
    Star,
    User,
    Tag,
    ShoppingBag,
    Maximize2,
    Minimize2
} from 'lucide-react';

interface ResultCardProps {
    result: SearchResult;
    index: number;
}

export function ResultCard({ result, index }: ResultCardProps) {
    const [isPortalOpen, setIsPortalOpen] = useState(false);

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    const getCategoryIcon = (cat: SearchCategory) => {
        switch (cat) {
            case 'repositories': return <Book size={16} />;
            case 'code': return <Code2 size={16} />;
            case 'commits': return <GitCommit size={16} />;
            case 'issues': return <Info size={16} className="text-[#3fb950]" />;
            case 'pull_requests': return <GitPullRequest size={16} className="text-[#a371f7]" />;
            case 'discussions': return <MessageSquare size={16} />;
            case 'packages': return <Package size={16} />;
            case 'wikis': return <Book size={16} />;
            case 'users': return <User size={16} />;
            case 'topics': return <Tag size={16} />;
            case 'marketplace': return <ShoppingBag size={16} />;
            default: return <Hash size={16} />;
        }
    };

    const getLanguageColor = (lang?: string) => {
        const colors: Record<string, string> = {
            'TypeScript': '#3178c6',
            'JavaScript': '#f1e05a',
            'Rust': '#dea584',
            'Go': '#00add8',
            'Python': '#3572a5',
            'C++': '#f34b7d',
            'Java': '#b07219',
            'HTML': '#e34c26',
            'CSS': '#563d7c',
        };
        return colors[lang || ''] || '#8b949e';
    };

    const [owner, repoName] = (result.repository || '').split('/');

    return (
        <motion.div
            layout
            custom={index}
            variants={resultCardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
                p-4 border border-cyber-border bg-cyber-bg-secondary/40 rounded-md 
                hover:bg-cyber-bg-secondary transition-all relative overflow-hidden
                ${isPortalOpen ? 'ring-2 ring-cyber-accent/50 bg-cyber-bg-secondary' : ''}
            `}
        >
            <div className="flex items-start gap-2">
                <div className="mt-1 text-cyber-text-muted">
                    {getCategoryIcon(result.category)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                            <a
                                href={`https://github.com/${result.repository}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-github-link font-medium hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {result.repository}
                            </a>
                            {result.path && (
                                <>
                                    <span className="text-cyber-text-muted">/</span>
                                    <span className="text-cyber-text-secondary truncate max-w-[200px] font-mono text-xs">
                                        {result.path}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Portal Trigger */}
                        {owner && repoName && (
                            <button
                                onClick={() => setIsPortalOpen(!isPortalOpen)}
                                className={`
                                    p-1.5 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase
                                    ${isPortalOpen
                                        ? 'bg-cyber-accent text-white shadow-glow'
                                        : 'bg-cyber-bg-tertiary text-cyber-text-muted hover:text-cyber-text hover:bg-cyber-bg-tertiary/80'}
                                `}
                            >
                                {isPortalOpen ? (
                                    <>CLOSE PORTAL <Minimize2 size={12} /></>
                                ) : (
                                    <>OPEN PORTAL <Maximize2 size={12} /></>
                                )}
                            </button>
                        )}
                    </div>

                    <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-github-link text-base font-semibold hover:underline block mt-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {result.title}
                    </a>

                    {result.subtitle && result.subtitle !== result.title && (
                        <p className="text-sm text-cyber-text-secondary mt-1 line-clamp-2 leading-relaxed">
                            {result.subtitle}
                        </p>
                    )}

                    {result.snippet && !isPortalOpen && (
                        <div className="mt-2 text-[12px] font-mono bg-[#0d1117] border border-[#30363d] rounded p-2 overflow-x-auto text-[#e6edf3]">
                            <pre className="whitespace-pre">
                                {result.snippet}
                            </pre>
                        </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-cyber-text-muted">
                        {result.language && (
                            <div className="flex items-center gap-1">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getLanguageColor(result.language) }}
                                />
                                <span>{result.language}</span>
                            </div>
                        )}

                        {result.stars !== undefined && (
                            <div className="flex items-center gap-1">
                                <Star size={14} />
                                <span>{result.stars.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-cyber-bg-tertiary px-1.5 py-0.5 rounded border border-cyber-border tabular-nums">
                                {result.score.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Emergent Properties Overlay (Ghost/Latent) */}
            {result.isEmergent && (
                <div className="absolute top-0 right-0 p-1.5 z-10">
                    <div className={`
                        px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border shadow-lg backdrop-blur-md
                        ${result.evaluation === 'OPPORTUNITY_DETECTED'
                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                            : result.evaluation === 'REGEX_UNMATCHED'
                                ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                : result.evaluation === 'REGEX_VERIFIED'
                                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                    : result.evaluation?.startsWith('FUZZY_MATCH')
                                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                                        : result.evaluation === 'STRUCTURAL_MATCH'
                                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                            : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}
                     `}>
                        {result.evaluation || 'LATENT MATCH'}
                        {result.latentScore && <span className="ml-1 opacity-75">::{result.latentScore}%</span>}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isPortalOpen && owner && repoName && (
                    <SearchPortal
                        owner={owner}
                        repo={repoName}
                        onClose={() => setIsPortalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
