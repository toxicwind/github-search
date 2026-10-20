"use client";

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useInstantSearch } from '../hooks/useInstantSearch';
import { SearchBar } from '../components/SearchBar';
import { ResultCard } from '../components/ResultCard';
import { ClusterGraph } from '../components/ClusterGraph';
import { LogDashboard } from '../components/LogDashboard';
import { apiClient } from '../lib/api-client';
import { staggerContainer, fadeIn } from '../lib/animations';
import type { SearchCategory } from '../types/search';

export default function Home() {
  const [smart, setSmart] = useState(true);
  const [cluster, setCluster] = useState(false);
  const [compare, setCompare] = useState(false);
  const [selectedCats, setSelectedCats] = useState<SearchCategory[]>(['unified']);
  const [query, setQuery] = useState('');

  const searchOptions = useMemo(() => ({
    debounceMs: 300,
    categories: selectedCats,
    perPage: 20,
    smart,
    cluster,
  }), [selectedCats, smart, cluster]);

  const { results, clusteredResults, isLoading, error, searchTime, search, clearResults } = useInstantSearch(searchOptions);

  const { data: compareData, isLoading: isComparing } = useQuery({
    queryKey: ['compare', query],
    queryFn: () => apiClient.compare(query),
    enabled: compare && query.trim().length > 0,
    staleTime: 60000,
  });

  const hasResults = results.length > 0 || clusteredResults !== null;

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    search(newQuery);
  };

  const handleClear = () => {
    setQuery('');
    clearResults();
  };

  return (
    <div className="min-h-screen bg-cyber-bg font-sans selection:bg-cyber-accent/30 text-cyber-text">
      {/* Header */}
      <header className="border-b border-cyber-border bg-cyber-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyber-accent rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold">GitHub Discovery</h1>
          </div>

          <div className="flex-1 max-w-2xl px-8">
            <SearchBar
              value={query}
              onChange={handleSearch}
              onClear={handleClear}
              isLoading={isLoading || isComparing}
              searchTime={searchTime}
            />
          </div>

          <div className="flex items-center gap-6 text-sm font-medium">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCompare(!compare)}
                className={`flex items-center gap-2 transition-all px-3 py-1 rounded-full border ${compare ? 'bg-cyber-accent/20 border-cyber-accent text-cyber-accent' : 'border-cyber-border text-cyber-text-muted hover:border-white/20'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Live Compare
              </button>
              <button onClick={() => setSmart(!smart)} className={`transition-colors ${smart ? 'text-cyber-accent' : 'text-cyber-text-muted'}`}>
                Smart Mode
              </button>
              <button onClick={() => setCluster(!cluster)} className={`transition-colors ${cluster ? 'text-cyber-accent' : 'text-cyber-text-muted'}`}>
                Visualization
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 sticky top-24 self-start">
          <nav className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold text-cyber-text-muted px-3 mb-2 uppercase tracking-wider">Discovery Mode</h2>
            {(['unified'] as SearchCategory[]).map(cat => {
              const isActive = selectedCats.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCats(['unified'])}
                  className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm mb-4 ${isActive
                    ? 'bg-cyber-accent/10 border border-cyber-accent/30 font-bold text-cyber-accent'
                    : 'text-cyber-text-secondary hover:bg-github-sidebar-hover'
                    }`}
                >
                  <span className="capitalize">Unified Discovery</span>
                </button>
              );
            })}

            <h2 className="text-xs font-semibold text-cyber-text-muted px-3 mb-2 uppercase tracking-wider">Specific Filters</h2>
            {(['repositories', 'code', 'commits', 'issues', 'pull_requests', 'discussions', 'packages', 'wikis', 'users', 'topics', 'marketplace'] as SearchCategory[]).map(cat => {
              const isActive = selectedCats.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCats(prev => {
                      if (prev.includes('unified')) return [cat];
                      return prev.includes(cat) ? (prev.length > 1 ? prev.filter(c => c !== cat) : prev) : [...prev, cat];
                    });
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm ${isActive
                    ? 'bg-cyber-bg-tertiary border border-cyber-border font-semibold text-cyber-text'
                    : 'text-cyber-text-secondary hover:bg-github-sidebar-hover'
                    }`}
                >
                  <span className="capitalize">{cat.replace('_', ' ')}</span>
                  {isActive && results.filter(r => r.category === cat).length > 0 && (
                    <span className="bg-github-badge-bg px-2 py-0.5 rounded-full text-[10px]">
                      {results.filter(r => r.category === cat).length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Results Area */}
        <div className="flex-1 min-w-0">
          {error && (
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="border border-red-500/20 bg-red-500/10 rounded-xl p-4 text-red-400 text-sm mb-8"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Operational Error:</strong> {error.message}</span>
              </div>
            </motion.div>
          )}

          {compare && compareData ? (
            <div className="grid grid-cols-2 gap-8 h-full">
              {/* Optimised Result Column */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-cyber-accent">
                    Antigravity Optimized ({compareData.meta.optimised_count})
                  </h2>
                </div>
                <div className="space-y-4">
                  {compareData.optimised.map((result, i) => (
                    <ResultCard key={result.url + i} result={result} index={i} />
                  ))}
                </div>
              </div>

              {/* Raw Result Column */}
              <div className="space-y-6 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                    Standard GitHub API ({compareData.meta.raw_count})
                  </h2>
                </div>
                <div className="space-y-4">
                  {compareData.raw.map((result, i) => (
                    <ResultCard key={result.url + i} result={result} index={i} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {hasResults && (
                <div className="grid grid-cols-1 gap-10">
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-cyber-text-muted">
                        Discovered <span className="text-cyber-accent">{results.length}</span> optimized patterns
                      </h2>
                    </div>

                    <AnimatePresence mode="popLayout">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        {results.slice(0, 20).map((result, index) => (
                          <ResultCard key={result.url + index} result={result} index={index} />
                        ))}
                      </div>
                    </AnimatePresence>
                  </motion.div>

                  {/* Cluster Visualization Overlay/Section */}
                  {cluster && clusteredResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-10"
                    >
                      <div className="glass-card p-1">
                        <ClusterGraph
                          data={clusteredResults}
                          onSelectCluster={(id) => {
                            console.log('Selected cluster:', id);
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {!isLoading && !hasResults && !error && query.trim() === '' && (
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="text-center py-32"
                >
                  <div className="w-24 h-24 mx-auto mb-10 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 group hover:border-cyber-accent/30 transition-all duration-500 shadow-2xl">
                    <svg width="48" height="48" className="text-cyber-accent group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-cyber-text mb-4 tracking-tight">
                    Ready for Deep Discovery
                  </h3>
                  <p className="text-cyber-text-secondary mb-10 max-w-lg mx-auto leading-relaxed">
                    Explore complex code patterns across GitHub with high-fidelity semantic clustering and real-time visualization.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => handleSearch("language:Rust parallel")} className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-cyber-accent transition-all hover:border-cyber-accent/30 tracking-widest uppercase">language:Rust parallel</button>
                    <button onClick={() => handleSearch("/async.*await/")} className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-cyber-accent transition-all hover:border-cyber-accent/30 tracking-widest uppercase">/async.*await/</button>
                    <button onClick={() => handleSearch("topic:mcp-server")} className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-cyber-accent transition-all hover:border-cyber-accent/30 tracking-widest uppercase">topic:mcp-server</button>
                  </div>
                  <div className="mt-12 text-[10px] font-bold text-cyber-text-muted tracking-[0.3em] uppercase opacity-50">
                    [ AGENTIC_STABILIZED // SYSTEM_READY ]
                  </div>
                </motion.div>
              )}

              {!isLoading && !hasResults && !error && query.trim() !== '' && (
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="text-center py-32"
                >
                  <div className="text-6xl mb-6 grayscale opacity-50">🔍</div>
                  <h3 className="text-2xl font-bold text-cyber-text mb-3">
                    Zero Matches Found
                  </h3>
                  <p className="text-cyber-text-secondary max-w-sm mx-auto">
                    The pattern search returned no results for "{query}". Try broadening your constraints.
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Observability Section (Log Viewer) */}
        <aside className="w-96 flex-shrink-0 flex flex-col gap-6 sticky top-24 self-start h-[calc(100vh-8rem)]">
          <LogDashboard />
        </aside>
      </main>

      <footer className="border-t border-cyber-border bg-cyber-bg-secondary mt-32 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="text-[10px] font-bold tracking-[0.4em] text-cyber-text-muted uppercase">
            HYPEBRUT // DISCOVERY // ENGINE
          </div>
          <p className="text-xs text-cyber-text-muted opacity-60">
            Powered by Next.js 15 & Rust API Server • High-Fidelity Sync Active
          </p>
        </div>
      </footer>
    </div>
  );
}
