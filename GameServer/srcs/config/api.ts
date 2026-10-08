// API configuration

const gameEnv = (import.meta as any)?.env ?? {};
const DEFAULT_BACKEND_PORT = process.env.BACKEND_PORT || '3002';

const getRuntimeBaseUrl = (): string => {
	if (typeof window === 'undefined') {
		return `https://localhost:${DEFAULT_BACKEND_PORT}`;
	}
	const { protocol, hostname } = window.location;
	return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

const resolveApiBaseUrl = (): string => {
	const configured = (gameEnv.BACKEND_URL || process.env.BACKEND_URL || '').trim();
	const runtimeBase = getRuntimeBaseUrl();

	if (!configured || configured.toLowerCase() === 'auto') {
		return runtimeBase;
	}

	try {
		const configuredUrl = new URL(configured);
		// If no port was provided, fall back to the backend port env/default
		if (!configuredUrl.port) {
			configuredUrl.port = DEFAULT_BACKEND_PORT;
		}
		if (typeof window !== 'undefined') {
			const runtimeHost = window.location.hostname;
			if (runtimeHost && runtimeHost !== configuredUrl.hostname) {
				const protocol = configuredUrl.protocol || window.location.protocol;
				const port = configuredUrl.port || DEFAULT_BACKEND_PORT;
				return `${protocol}//${runtimeHost}:${port}`;
			}
		}
		return configured;
	} catch {
		return runtimeBase;
	}
};

export const API_BASE_URL = resolveApiBaseUrl();

// Helper function to create API URLs
export const createApiUrl = (endpoint: string): string => {
	return `${API_BASE_URL}${endpoint}`;
};
