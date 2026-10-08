import { FastifyInstance } from 'fastify';
import { updateUserOnlineStatus } from '../../db_functionalities/usersTableFunctions';

export async function logout(fastify: FastifyInstance) {
	fastify.post<{ Body: { nickname: string } }>('/api/logout', async (request, reply) => {
		const { nickname } = request.body;
		if (!nickname) {
			return reply.status(400).send({ message: 'Nickname is required' });
		}

		await updateUserOnlineStatus(nickname, false);

		reply.clearCookie('token', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
		});
		return reply.send({ message: 'Logout successful' });
	});

	fastify.post('/api/logout-status', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		if (nickname) {
			await updateUserOnlineStatus(nickname, false);
		}
		return reply.status(200).send({ message: 'Status updated' });
	});
}
