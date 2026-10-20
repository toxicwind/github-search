'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClusteredResults, Cluster } from '@/types/search';
import { Hexagon, Network, ToyBrick } from 'lucide-react';

interface ClusterGraphProps {
    data: ClusteredResults;
    onSelectCluster?: (id: string) => void;
    selectedId?: string;
}

export function ClusterGraph({ data, onSelectCluster, selectedId }: ClusterGraphProps) {
    // Flatten all clusters and add id field for visualization
    const clusters = useMemo(() => {
        const all: Array<Cluster & { id: string }> = [];

        // Combine all cluster types with unique IDs
        data.by_category?.forEach((c, i) => {
            all.push({ ...c, id: `cat-${i}-${c.name}` });
        });
        data.by_language?.forEach((c, i) => {
            all.push({ ...c, id: `lang-${i}-${c.name}` });
        });
        data.by_repo?.slice(0, 5).forEach((c, i) => { // Limit repos to top 5
            all.push({ ...c, id: `repo-${i}-${c.name}` });
        });

        return all;
    }, [data]);

    const layout = useMemo(() => {
        // Basic circular layout for clusters
        const radius = 150;
        const centerX = 200;
        const centerY = 200;

        return clusters.map((c, i) => {
            const angle = (i / (clusters.length || 1)) * Math.PI * 2;
            return {
                ...c,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
            };
        });
    }, [clusters]);

    if (!clusters.length) return null;

    return (
        <div className="glass-card p-6 mt-8 overflow-hidden relative min-h-[450px]">
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <Network className="text-cyber-accent w-5 h-5" />
                <h3 className="text-cyber-text font-bold uppercase tracking-widest text-sm">Cluster Visualization</h3>
            </div>

            <svg viewBox="0 0 400 400" className="w-full max-w-[500px] mx-auto">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Connection Lines to Center */}
                {layout.map((c, i) => (
                    <motion.line
                        key={`line-${i}`}
                        x1="200" y1="200"
                        x2={c.x} y2={c.y}
                        stroke="var(--cyber-border)"
                        strokeWidth="1"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.3 }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                    />
                ))}

                {/* Center Node (Origin) */}
                <motion.circle
                    cx="200" cy="200" r="10"
                    fill="var(--cyber-accent)"
                    filter="url(#glow)"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                />

                {/* Cluster Nodes */}
                {layout.map((c, i) => {
                    const isSelected = selectedId === c.id;
                    return (
                        <motion.g
                            key={c.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => onSelectCluster?.(c.id)}
                            className="cursor-pointer"
                        >
                            <motion.circle
                                cx={c.x}
                                cy={c.y}
                                r={20 + (c.items.length * 2)}
                                fill={isSelected ? 'var(--cyber-accent-bright)' : 'var(--cyber-surface)'}
                                stroke={isSelected ? 'var(--cyber-accent)' : 'var(--cyber-border)'}
                                strokeWidth="2"
                                filter={isSelected ? 'url(#glow)' : undefined}
                                className="transition-colors duration-300"
                            />
                            <foreignObject x={c.x - 30} y={c.y + 25} width="60" height="40">
                                <div className="text-[8px] text-center text-cyber-text-secondary truncate font-mono uppercase">
                                    {c.name}
                                </div>
                            </foreignObject>
                        </motion.g>
                    );
                })}
            </svg>

            {/* Legend / Info */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1 items-end">
                <span className="text-[10px] text-cyber-text-muted font-mono uppercase">Nodes: {clusters.length}</span>
                <span className="text-[10px] text-cyber-text-muted font-mono uppercase">Avg Density: {(clusters.reduce((acc, c) => acc + c.items.length, 0) / clusters.length).toFixed(1)}</span>
            </div>
        </div>
    );
}
