// API configuration

const DEFAULT_BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || '3002';

const getRuntimeBaseUrl = (): string => {
	if (typeof window === 'undefined') {
		return `https://localhost:${DEFAULT_BACKEND_PORT}`;
	}
	const { protocol, hostname } = window.location;
	return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

const resolveApiBaseUrl = (): string => {
	const configured = import.meta.env.VITE_BACKEND_URL?.trim();
	const runtimeBase = getRuntimeBaseUrl();

	if (!configured || configured.toLowerCase() === 'auto') {
		return runtimeBase;
	}

	try {
		const configuredUrl = new URL(configured);
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

// Helper function to create WebSocket URL
export const createWebSocketUrl = (endpoint: string): string => {
	const wsUrl = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
	return `${wsUrl}${endpoint}`;
};
export const API_URLS = {
	backend: API_BASE_URL,
	gameWs: import.meta.env.VITE_GAME_WS_URL || createWebSocketUrl('/connect'),
};
