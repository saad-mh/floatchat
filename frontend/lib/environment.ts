/**
 * Environment detection utility
 * Automatically detects if running on localhost or production
 */

export function getBaseUrl(request?: Request): string {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
        // Client-side detection
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Check common development ports
            if (port === '3000' || port === '3001') {
                return `${protocol}//${hostname}:${port}`;
            }
            // Default to 3000 if no port specified
            return `${protocol}//${hostname}:3000`;
        }

        // Production environment
        return `${protocol}//${hostname}`;
    }

    // Server-side detection with request headers
    if (request) {
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'http';

        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            return `${protocol}://${host}`;
        }
    }

    // Server-side detection
    const isDevelopment = process.env.NODE_ENV === 'development';

    // If development, prioritize localhost detection
    if (isDevelopment) {
        // Default to localhost:3000 for development
        return 'http://localhost:3000';
    }

    // Production detection
    const vercelUrl = process.env.VERCEL_URL;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    // Priority order: Custom domain > NEXTAUTH_URL > Vercel URL > fallback
    // Always prefer the production domain over deployment-specific URLs
    if (nextAuthUrl && !nextAuthUrl.includes('localhost')) {
        return nextAuthUrl;
    }

    // Check if we're on the production domain by looking at host header
    if (request) {
        const host = request.headers.get('host');
        if (host === 'floatchat-chi.vercel.app') {
            return 'https://floatchat-chi.vercel.app';
        }
    }

    // Use production domain as priority over deployment URLs
    return 'https://floatchat-chi.vercel.app';
}

export function getAuthRedirectUrl(): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/auth/google/callback`;
}

export function isLocalhost(): boolean {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }

    const baseUrl = getBaseUrl();
    return baseUrl.includes('localhost');
}

export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || isLocalhost();
}

export function isProduction(): boolean {
    return !isDevelopment();
}

export async function checkEndpointAvailability(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/api/auth/session`, {
            method: 'HEAD',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.status < 500;
    } catch {
        return false;
    }
}

export async function getActiveBaseUrl(): Promise<string> {
    // Try localhost first (development priority)
    const localhostUrls = [
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    for (const url of localhostUrls) {
        if (await checkEndpointAvailability(url)) {
            console.log(`✅ Using localhost: ${url}`);
            return url;
        }
    }

    // Fallback to production
    const productionUrl = 'https://floatchat-chi.vercel.app';
    console.log(`🌐 Using production: ${productionUrl}`);
    return productionUrl;
}