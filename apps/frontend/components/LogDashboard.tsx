'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Shield, Cpu, Activity, Search } from 'lucide-react';
import { resolveApiBaseUrl } from '../lib/api-client';

interface LogEntry {
    timestamp?: string;
    level?: string;
    message?: string;
    [key: string]: any;
}

export const LogDashboard = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [connected, setConnected] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const eventSource = new EventSource(`${resolveApiBaseUrl()}/api/logs/frontend/stream`);

        eventSource.onopen = () => {
            setConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLogs((prev) => [...prev.slice(-499), data]);
            } catch (e) {
                setLogs((prev) => [...prev.slice(-499), { message: event.data }]);
            }
        };

        eventSource.onerror = () => {
            setConnected(false);
        };

        return () => {
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    return (
        <div className="flex flex-col h-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <h2 className="text-sm font-semibold text-white/90 tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        INTELLIGENCE_STREAM.JSONL
                    </h2>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <Terminal className="w-3 h-3 text-white/50" />
                        <span className="text-[10px] font-mono text-white/50 uppercase">Tail Mode</span>
                    </div>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[10px] font-mono px-3 py-1 rounded-full border transition-all ${autoScroll ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                        AUTOSCROLL: {autoScroll ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Log Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-2 selection:bg-cyan-500/30 scrollbar-thin scrollbar-thumb-white/10"
                onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
                    if (!isAtBottom && autoScroll) setAutoScroll(false);
                }}
            >
                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
                        <Cpu className="w-12 h-12 stroke-[1px] animate-pulse" />
                        <p className="text-sm tracking-widest">AWAITING_INPUT_STREAM...</p>
                    </div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="group flex gap-4 hover:bg-white/5 p-1 rounded transition-colors border-l-2 border-transparent hover:border-cyan-500/50">
                        <span className="text-white/20 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
                        <div className="flex-1 break-all">
                            {typeof log === 'string' ? (
                                <span className="text-white/70">{log}</span>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-cyan-400 font-bold">{log.level || 'INFO'}</span>
                                    <span className="text-white/80">{log.message || JSON.stringify(log)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/5 bg-black/40 flex justify-between items-center">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-emerald-400/50" />
                        <span className="text-[10px] text-white/30 uppercase tracking-tighter">Guard: Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-cyan-400/50" />
                        <span className="text-[10px] text-white/30 uppercase tracking-tighter">Buffer: {logs.length}/500</span>
                    </div>
                </div>
                <div className="text-[10px] font-mono text-white/20">
                    ANTIGRAVITY_WHITE_V34
                </div>
            </div>
        </div>
    );
};
