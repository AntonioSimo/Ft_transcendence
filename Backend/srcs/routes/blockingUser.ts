import { FastifyInstance } from 'fastify';
import * as block from '../../db_functionalities/add_blocked_users';
import { response } from 'express';

export async function blockingUserRoutes(fastify: FastifyInstance) {
	fastify.post('/api/block', async (request, reply) => {
		const { blockerNickname, blockedNicknames } = request.body as {
			blockerNickname: string;
			blockedNicknames: string[];
		};
		await block.addBlockedUsers(blockerNickname, blockedNicknames);
		return { message: 'Users blocked successfully' };
	});

	fastify.delete('/api/unblock', async (request, reply) => {
		const { blockerNickname, unblockedNicknames } = request.body as {
			blockerNickname: string;
			unblockedNicknames: string;
		};
		await block.removeBlockUsers(blockerNickname, unblockedNicknames);
		return { message: 'Users unblocked successfully' };
	});

	fastify.get('/api/checkBlock', async (request, reply) => {
		const blockerNickname = request.headers['blocker-nickname'] as string;
		const blockedNickname = request.headers['blocked-nickname'] as string;
		const isBlocked = await block.isUserBlocked(blockerNickname, blockedNickname);
		if (isBlocked) {
			return { blocked: true };
		} else {
			return { blocked: false };
		}
	});
	fastify.get('/api/whoDidIBlocked', async (request, reply) => {
		const { blockerNickname } = request.query as {
			blockerNickname: string;
		};
		const blockedUsers = await block.whoDidIBlocked(blockerNickname);
		if (!blockedUsers) {
			return [];
		}
		return { blockedUsers };
	});
	fastify.get('/api/whoBlockedMe', async (request, reply) => {
		const { blockedNickname } = request.query as {
			blockedNickname: string;
		};
		const blockingUsers = await block.whoBlockedMe(blockedNickname);
		if (!blockingUsers) {
			return [];
		}
		return { blockingUsers };
	});
}
