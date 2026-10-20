'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, Folder, ChevronRight, ChevronDown, CheckCircle, ShieldAlert } from 'lucide-react';
import { getRepoTree, getFileContent } from '../actions/github';
import ReactMarkdown from 'react-markdown';
import Mermaid from './Mermaid';
import LiveGraph from './LiveGraph';

interface SearchPortalProps {
    owner: string;
    repo: string;
    onClose: () => void;
}

interface TreeNode {
    path: string;
    type: 'blob' | 'tree';
    sha: string;
}

export function SearchPortal({ owner, repo, onClose }: SearchPortalProps) {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [isLoadingTree, setIsLoadingTree] = useState(true);
    const [activeFile, setActiveFile] = useState<string>('README.md');
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [healthScore, setHealthScore] = useState<number | null>(null);

    useEffect(() => {
        // Fetch Tree
        setIsLoadingTree(true);
        getRepoTree(owner, repo).then(res => {
            if (res.data) {
                setTree(res.data as TreeNode[]);
                // Calculate simple health score based on file presence
                let score = 50; // Base
                const paths = res.data.map((n: any) => n.path);
                if (paths.includes('package.json')) score += 10;
                if (paths.includes('Cargo.toml')) score += 10;
                if (paths.includes('Dockerfile')) score += 10;
                if (paths.some((p: string) => p.includes('test'))) score += 10;
                if (paths.includes('.github/workflows')) score += 10;
                setHealthScore(score);
            }
            setIsLoadingTree(false);
        });
    }, [owner, repo]);

    useEffect(() => {
        // Fetch Content
        if (!activeFile) return;
        setIsLoadingContent(true);
        getFileContent(owner, repo, activeFile).then(res => {
            if (res.content) {
                setFileContent(res.content);
            } else {
                setFileContent('// Failed to load content or binary file');
            }
            setIsLoadingContent(false);
        });
    }, [owner, repo, activeFile]);

    // Simple recursive renderer for tree could be complex, 
    // for now let's just show top-level and 2nd level flat list filtered by relevance?
    // "God Mode" implies we show everything but maybe filtered.
    // Let's just show a simple list for the MVP of the Portal.

    // Sort: folders first, then files.
    const sortedTree = [...tree].sort((a, b) => {
        if (a.type === b.type) return a.path.localeCompare(b.path);
        return a.type === 'tree' ? -1 : 1;
    });

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mt-4 border-t border-cyber-border bg-black/40 rounded-b-md overflow-hidden flex flex-col md:flex-row h-[500px]"
        >
            {/* Sidebar: File Tree & Health */}
            <div className="w-full md:w-1/3 border-r border-cyber-border flex flex-col">
                <div className="p-3 border-b border-cyber-border bg-cyber-bg-tertiary flex items-center justify-between">
                    <span className="text-xs font-mono text-cyber-text-muted">FILESYSTEM</span>
                    {healthScore !== null && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${healthScore > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {healthScore > 80 ? <CheckCircle size={12} /> : <ShieldAlert size={12} />}
                            HEALTH: {healthScore}%
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
                    {isLoadingTree ? (
                        <div className="flex flex-col gap-2 p-4">
                            <div className="w-full h-4 bg-cyber-border/30 animate-pulse rounded" />
                            <div className="w-2/3 h-4 bg-cyber-border/30 animate-pulse rounded" />
                            <div className="w-3/4 h-4 bg-cyber-border/30 animate-pulse rounded" />
                        </div>
                    ) : (
                        sortedTree.map((node) => (
                            <div
                                key={node.sha}
                                onClick={() => node.type === 'blob' && setActiveFile(node.path)}
                                className={`
                                    flex items-center gap-2 p-1.5 rounded cursor-pointer truncate
                                    ${activeFile === node.path ? 'bg-cyber-accent/20 text-cyber-accent' : 'text-cyber-text-secondary hover:bg-white/5'}
                                    ${node.type === 'blob' ? 'ml-4' : ''}
                                `}
                            >
                                {node.type === 'tree' ? <Folder size={12} /> : <File size={12} />}
                                <span>{node.path.split('/').pop()}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Content Preview */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
                <div className="p-3 border-b border-cyber-border bg-cyber-bg-tertiary flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <File size={14} className="text-cyber-text-muted" />
                        <span className="text-xs font-mono text-cyber-text">{activeFile}</span>
                    </div>
                    <button onClick={onClose} className="text-xs hover:text-red-400 text-cyber-text-muted">CLOSE X-RAY</button>
                </div>

                <div className="flex-1 overflow-auto p-4 relative">
                    {isLoadingContent ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-cyber-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        activeFile.endsWith('.md') ? (
                            <div className="prose prose-invert max-w-none text-xs text-cyber-text-secondary">
                                <ReactMarkdown
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isMermaid = match && match[1] === 'mermaid';

                                            if (!inline && isMermaid) {
                                                return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                                            }

                                            return (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}
                                >
                                    {fileContent}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <pre className="text-xs font-mono text-cyber-text-secondary whitespace-pre-wrap break-all">
                                {fileContent}
                            </pre>
                        )
                    )}
                </div>

                {/* Agent Action Bar */}
                <div className="p-3 border-t border-cyber-border bg-cyber-bg-secondary flex items-center gap-3">
                    <div className="text-[10px] font-bold text-cyber-accent uppercase tracking-wider">Agent Actions:</div>
                    <button className="px-3 py-1 bg-cyber-accent/10 hover:bg-cyber-accent/20 border border-cyber-accent/30 rounded text-xs text-cyber-accent transition-colors">
                        Auto-Install
                    </button>
                    <button className="px-3 py-1 bg-cyber-accent/10 hover:bg-cyber-accent/20 border border-cyber-accent/30 rounded text-xs text-cyber-accent transition-colors">
                        Generate Tests
                    </button>
                </div>

                {/* Live Graph Demo */}
                <div className="p-4 border-t border-cyber-border">
                    <LiveGraph
                        nodes={[
                            { id: "Main", group: 1, type: "struct" },
                            { id: "Worker", group: 2, type: "struct" },
                            { id: "process()", group: 2, type: "function" },
                            { id: "Config", group: 1, type: "enum" }
                        ]}
                        links={[
                            { source: "Main", target: "Worker", value: 5 },
                            { source: "Worker", target: "process()", value: 3 },
                            { source: "Main", target: "Config", value: 1 }
                        ]}
                        width={600}
                        height={200}
                    />
                </div>
            </div>
        </motion.div>
    );
}
