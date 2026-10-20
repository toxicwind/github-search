console.log('GitHub Advanced Search - Ready');
const html = document.documentElement;

// --- Theme ---
function toggleTheme() {
    if (html.classList.contains('light')) {
        html.classList.remove('light');
        localStorage.theme = 'dark';
        document.getElementById('theme-icon').innerText = '🌙';
    } else {
        html.classList.add('light');
        localStorage.theme = 'light';
        document.getElementById('theme-icon').innerText = '☀️';
    }
}
if (localStorage.theme === 'light') {
    html.classList.add('light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = '☀️';
}

// --- Dashboard ---
const btn = document.getElementById('btn-dashboard');
if (btn) {
    btn.addEventListener('click', async () => {
        const modal = document.getElementById('modal-metrics');
        if (modal) {
            modal.classList.add('active');
            // Load content
            const content = document.getElementById('metrics-modal-content');
            content.innerHTML = '<div class="col-span-2 text-center text-blue-400">Loading live metrics...</div>';
            try {
                const res = await fetch('/api/metrics');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();

                const html = data.dials.map(d => `
                    <div class="p-4 bg-gray-800 rounded text-center">
                        <div class="text-2xl font-bold text-blue-400">${d.value}</div>
                        <div class="text-xs text-gray-500">${d.unit.toUpperCase()}</div>
                        <div class="text-sm text-gray-300">${d.label}</div>
                    </div>
                `).join('');
                content.innerHTML = html;
            } catch (e) {
                content.innerHTML = `<div class="col-span-2 text-red-400">Error: ${e}</div>`;
            }
        }
    });
}

// --- Regex Mode ---
const chkRegex = document.getElementById('chk-regex');
const inputQuery = document.querySelector('input[name="query"]');

if (chkRegex && inputQuery) {
    chkRegex.addEventListener('change', () => {
        if (chkRegex.checked) {
            inputQuery.placeholder = "Enter regex pattern (e.g. ^fn.*main)";
            inputQuery.focus();
        } else {
            inputQuery.placeholder = "Search GitHub...";
        }
    });
}

// --- Recent Searches ---
const RECENT_KEY = 'gh-recent';
function loadRecent() {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return;
    try {
        const items = JSON.parse(raw);
        const container = document.getElementById('recent-searches');
        if (!container) return;
        container.innerHTML = items.map(q => `
            <span class="cursor-pointer px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 border border-gray-700 transition-colors" onclick="setQuery('${q}')">${q}</span>
        `).join('');
    } catch (e) { console.error(e); }
}

window.setQuery = (q) => {
    if (inputQuery) {
        inputQuery.value = q;
        inputQuery.focus();
        // Trigger htmx if needed, or just let user hit enter
    }
};

function saveRecent(q) {
    if (!q || q.trim().length === 0) return;
    let items = [];
    try {
        items = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch (e) { }
    // Dedupe and Unshift
    items = [q, ...items.filter(i => i !== q)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    loadRecent();
}

// Capture Search (HTMX Event)
document.body.addEventListener('htmx:configRequest', (evt) => {
    const q = inputQuery ? inputQuery.value : '';
    saveRecent(q);
});

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
    // / to focus
    if (e.key === '/' && document.activeElement !== inputQuery) {
        e.preventDefault();
        inputQuery?.focus();
    }

    // j/k navigation
    if ((e.key === 'j' || e.key === 'k') && document.activeElement !== inputQuery) {
        const resultsContainer = document.getElementById('results');
        if (!resultsContainer) return;
        const cards = Array.from(resultsContainer.children);
        if (cards.length === 0) return;

        let currentIndex = cards.findIndex(c => c.classList.contains('ring-2'));

        if (currentIndex !== -1) {
            cards[currentIndex].classList.remove('ring-2', 'ring-blue-500');
        }

        if (e.key === 'j') {
            currentIndex = (currentIndex === -1) ? 0 : Math.min(currentIndex + 1, cards.length - 1);
        } else if (e.key === 'k') {
            currentIndex = (currentIndex === -1) ? cards.length - 1 : Math.max(currentIndex - 1, 0);
        }

        const target = cards[currentIndex];
        if (target) {
            target.classList.add('ring-2', 'ring-blue-500');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Enter to open
    if (e.key === 'Enter' && document.activeElement !== inputQuery) {
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) {
            const selected = resultsContainer.querySelector('.ring-2');
            if (selected) {
                const link = selected.querySelector('a');
                if (link) window.open(link.href, '_blank');
            }
        }
    }
});

loadRecent();

// --- Deep Research ---
const btnResearch = document.getElementById('btn-research');
if (btnResearch) {
    btnResearch.addEventListener('click', async () => {
        const query = inputQuery ? inputQuery.value : '';
        if (!query.trim()) {
            alert('Please enter a query first.');
            return;
        }

        const panel = document.getElementById('research-panel');
        const content = document.getElementById('research-content');
        if (panel && content) {
            panel.classList.remove('hidden');
            content.innerHTML = '<div class="animate-pulse text-purple-400">Thinking... (This may take 10-20s)</div>';

            try {
                const res = await fetch('/api/summarize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || res.statusText);
                }

                const md = await res.text();
                if (window.marked) {
                    content.innerHTML = window.marked.parse(md);
                } else {
                    content.innerText = md;
                }
            } catch (e) {
                content.innerHTML = '<div class="text-red-400">Error: ' + e.message + '</div>';
            }
        }
    });
}

// --- Telemetry (Cycle 009) ---
let searchStart = 0;
document.body.addEventListener('htmx:beforeRequest', () => {
    searchStart = performance.now();
    console.log('[Telemetry] Search started');
});
document.body.addEventListener('htmx:afterRequest', () => {
    const duration = performance.now() - searchStart;
    console.log('[Telemetry] Search completed in ' + duration.toFixed(2) + 'ms');
});
