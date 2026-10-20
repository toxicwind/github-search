'use server';

import { Octokit } from 'octokit';

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined
});

export async function getRepoTree(owner: string, repo: string) {
    try {
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1', {
            owner,
            repo,
            tree_sha: 'HEAD',
        });
        // Filter to top-level or manageable size? No, let's just send the raw tree for now.
        // Client can process it.
        return { data: data.tree.slice(0, 1000) }; // Limit to 1000 items for safety
    } catch (error: any) {
        console.error('Failed to fetch tree:', error);
        return { error: error.message };
    }
}

export async function getFileContent(owner: string, repo: string, path: string) {
    try {
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
        });

        if (Array.isArray(data) || !('content' in data)) {
            return { error: 'Not a file' };
        }

        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return { content };
    } catch (error: any) {
        return { error: error.message };
    }
}
