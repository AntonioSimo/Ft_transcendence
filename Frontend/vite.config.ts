import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {
	const port = Number(process.env.FRONTEND_PORT) || 5173;
	const certDir = process.env.CERT_PATH ?? '/cert';
	const keyPath = path.join(certDir, 'key.pem');
	const certPath = path.join(certDir, 'cert.pem');

	if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
		throw new Error(
			`Missing TLS cert files. Expected key at ${keyPath} and cert at ${certPath}.`
		);
	}

	return {
		plugins: [react()],
		server: {
			host: true,
			port,
			strictPort: true,
			hmr: { clientPort: port },
			https: {
				key: fs.readFileSync(keyPath),
				cert: fs.readFileSync(certPath),
			},
		},
		preview: {
			host: true,
			port,
			strictPort: true,
		},
	};
});
