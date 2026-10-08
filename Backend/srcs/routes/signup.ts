import { FastifyInstance, FastifyReply } from 'fastify';
import { addUser } from '../../utils/add_users';

const USERNAME_PATTERN = '^[a-zA-Z0-9_.-]{3,30}$';

function sendError(reply: FastifyReply, status: number, message: string) {
	return reply.status(status).send({ success: false, message });
}

export async function signup(fastify: FastifyInstance) {
	fastify.post<{ Body: { nickname: string; email: string; password: string } }>(
		'/api/signup',
		{
			schema: {
				body: {
					type: 'object',
					required: ['nickname', 'email', 'password'],
					properties: {
						nickname: { type: 'string', pattern: USERNAME_PATTERN },
						email: { type: 'string', format: 'email' },
						password: { type: 'string', minLength: 4 },
					},
					additionalProperties: false,
				},
			},
		},
		async (request, reply) => {
			const { nickname, email, password } = request.body;
			if (!nickname || !email || !password) {
				return sendError(reply, 400, 'Nickname, email, and password are required');
			}

			try {
				const newUser = await addUser({ nickname, email, password });
				return reply.status(200).send({
					success: true,
					message: 'User created successfully',
					user: {
						id: newUser.id,
						nickname: newUser.nickname,
						email: newUser.email,
					},
				});
			} catch (error: any) {
				console.error('Signup error:', error);

				if (error instanceof Error) {
					if (error.message === 'EMAIL_EXISTS')
						return sendError(reply, 409, 'Email already in use');
					if (error.message === 'NICKNAME_EXISTS')
						return sendError(reply, 409, 'Nickname already taken');
				}

				return sendError(reply, 500, 'Internal server error');
			}
		}
	);
}
