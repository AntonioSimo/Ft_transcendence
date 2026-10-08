import Fastify from 'fastify';
import fastifyWs from '@fastify/websocket';
import { Game, broadcast, stopBroadcast } from './utils/game';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = process.env.CERT_PATH ?? '/cert';
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
	throw new Error(`Missing TLS cert files. Expected key at ${keyPath} and cert at ${certPath}.`);
}

const fastify = Fastify({
	logger: true,
	https: {
		key: fs.readFileSync(keyPath),
		cert: fs.readFileSync(certPath),
	},
});

const start = async () => {
	try {
		await fastify.register(fastifyWs);
		fastify.register(Game);
		broadcast();
		fastify.addHook('onClose', async () => {
			stopBroadcast();
		});
		await fastify.listen({ port: 4000, host: '0.0.0.0' }, (err, address) => {
			if (err) {
				console.error(err);
				process.exit(1);
			}
		});
	} catch (err) {
		fastify.log.error(err);
	}
};

start();
