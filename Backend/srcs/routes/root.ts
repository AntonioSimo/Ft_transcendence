import { FastifyInstance } from 'fastify';
import { config } from '../config';
import jwt from 'jsonwebtoken';

export async function root(fastify: FastifyInstance) {
	fastify.get('/', async (request, reply) => {
		const token = request.cookies.token;
		if (token) {
			try {
				jwt.verify(token, config.jwt.secret);
				return reply.send({ loggedIn: true });
			} catch {
				return reply.send({ loggedIn: false });
			}
		}
		return reply.send({ loggedIn: false });
	});
}
