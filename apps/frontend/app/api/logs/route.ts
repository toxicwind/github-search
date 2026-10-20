import { resolveApiBaseUrl } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export async function GET() {
    const response = await fetch(`${resolveApiBaseUrl()}/api/logs/frontend`, {
        cache: 'no-store',
    });
    const body = await response.text();
    return new Response(body, {
        status: response.status,
        headers: {
            'content-type': 'application/json',
        },
    });
}
