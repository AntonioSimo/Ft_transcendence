import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

import { loginUser } from '../../utils/login';
import { config } from '../config';

export async function login(fastify: FastifyInstance) {
	fastify.post<{ Body: { email_nickname: string; password: string } }>(
		'/api/login',
		async (request, reply) => {
			const { email_nickname, password } = request.body;

			if (!email_nickname || !password) {
				return reply.send({ message: 'Email or nickname and password are required' });
			}

			try {
				const user = await loginUser({ email_nickname, password });

				if (!user) {
					return reply.send({ message: 'Invalid credentials' });
				}

				const secret: jwt.Secret = config.jwt.secret;
				const expiration = config.jwt.expiration as jwt.SignOptions['expiresIn'];

				const token = jwt.sign(
					{
						id: user.id,
						nickname: user.nickname,
						email: user.email,
					},
					secret,
					{ expiresIn: expiration }
				);

				reply.setCookie('token', token, {
					httpOnly: true,
					secure: true,
					sameSite: 'none',
					path: '/',
					maxAge: 60 * 60 * 24, // leave it for 1 day in this way
				});

				return reply.send({
					message: 'Login successful',
					user: {
						id: user.id,
						nickname: user.nickname,
						email: user.email,
						is_online: false,
					},
				});
			} catch (error) {
				if (error instanceof Error && error.message === 'Invalid Password') {
					return reply.send({ message: 'Invalid password' });
				}

				return reply.send({ message: 'Invalid credentials' });
			}
		}
	);
}
