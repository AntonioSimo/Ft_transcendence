import 'dotenv/config';
import fs from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import path from 'path';
import { login } from './routes/login';
import { signup } from './routes/signup';
import { logout } from './routes/logout';
import { root } from './routes/root';
import { profile } from './routes/profile';
import { social } from './routes/social';
import { auth } from './routes/auth';
import { chat } from './routes/chat';
import websocket from '@fastify/websocket';
import { twoFA } from './routes/2fa';
import { gameInfo } from './routes/gameInfo';
import { matchMaking } from './routes/matchMaking';
import { blockingUserRoutes } from './routes/blockingUser';

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
		await fastify.register(cors, {
			origin: (origin, callback) => {
				const allowedPatterns = [
					/^https:\/\/localhost:5173$/,
					/^https:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
				];

				if (!origin || allowedPatterns.some((pattern) => pattern.test(origin))) {
					callback(null, true);
				} else {
					callback(new Error('Not allowed by CORS'), false);
				}
			},
			methods: ['GET', 'POST', 'PUT', 'DELETE'],
			credentials: true,
		});
		await fastify.register(cookie);
		await fastify.register(multipart);
		await fastify.register(websocket);
		fastify.register(login);
		fastify.register(signup);
		fastify.register(auth);
		fastify.register(root);
		fastify.register(social);
		fastify.register(logout);
		fastify.register(fastifyStatic, {
			root: path.join(__dirname, '..', 'avatars'),
			prefix: '/avatars/',
		});
		fastify.register(profile);
		fastify.register(chat);
		fastify.register(twoFA);
		fastify.register(gameInfo);
		fastify.register(matchMaking);
		fastify.register(blockingUserRoutes);

		await fastify.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
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
