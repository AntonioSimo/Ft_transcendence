import { FastifyInstance } from 'fastify';
import * as users from '../../db_functionalities/usersTableFunctions';

export async function social(fastify: FastifyInstance) {
	fastify.get('/api/nicknames', async (request, reply) => {
		try {
			const allUsers = await users.getAllUsers();

			const nicknames = allUsers.map((user) => ({
				nickname: user.nickname || 'Unknown',
				status: user.is_online,
			}));

			return reply.status(200).send(nicknames);
		} catch (error) {
			console.error('Error fetching all users:', error);
			return reply.status(500).send({ message: 'Internal server error' });
		}
	});
	fastify.get('/api/friends', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		if (!nickname) return reply.status(400).send('Missing nickname');
		try {
			const friends = await users.getNicknameFriendsFromGroupByNickname(nickname);
			return reply.status(200).send(friends);
		} catch (err) {
			reply.status(500).send('Failed to fetch friends');
		}
	});
	fastify.get('/api/tournament-alias', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		if (!nickname) {
			return reply.status(400).send('Missing nickname');
		}
		try {
			const tournament_alias = await users.getUserTournamentAlias(nickname);
			if (!tournament_alias) {
				return reply.status(404).send('User not found');
			}
			return reply.status(200).send({ tournament_alias: tournament_alias || null });
		} catch (err) {
			return reply.status(500).send('Failed to fetch tournament alias');
		}
	});
	fastify.post('/api/friend-requests', async (request, reply) => {
		const { nickname, friendNickname } = request.body as {
			nickname: string;
			friendNickname: string;
		};
		if (!nickname || !friendNickname) {
			return reply.status(400).send('Missing nickname or friendNickname');
		}
		if (nickname === friendNickname) {
			return reply.status(400).send('Cannot send friend request to yourself');
		}
		const existingRequest = await users.getFriendRequestBetween(nickname, friendNickname);
		if (existingRequest) {
			return reply.status(409).send('Friend request already exists');
		}
		if (await users.alreadyFriends(nickname, friendNickname)) {
			return reply.status(409).send('You are already friends');
		}

		try {
			await users.addFriendRequest(nickname, friendNickname);
			return reply.status(200).send('Friend request sent');
		} catch (err) {
			console.error('Error sending friend request:', err);
			return reply.status(500).send('Failed to send friend request');
		}
	});
	fastify.get('/api/friend-requests-received', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		if (!nickname) {
			return reply.status(400).send('Missing nickname');
		}
		try {
			const friendRequests = await users.getFriendRequestsReceived(nickname);
			return reply.status(200).send(friendRequests);
		} catch (err) {
			console.error('Error fetching friend requests:', err);
			return reply.status(500).send('Failed to fetch friend requests');
		}
	});
	fastify.post('/api/friend-requests-accept', async (request, reply) => {
		const { nickname, friendNickname } = request.body as {
			nickname: string;
			friendNickname: string;
		};
		if (!nickname || !friendNickname) {
			return reply.status(400).send('Missing nickname or friendNickname');
		}
		try {
			const requestToAccept = await users.getFriendRequestBetween(friendNickname, nickname);
			if (!requestToAccept) {
				return reply.status(404).send('Friend request not found');
			}
			const group = await users.acceptFriendRequest(nickname, friendNickname);
			return reply.status(200).send('Friend request accepted');
		} catch (err) {
			console.error('Error accepting friend request:', err);
			return reply.status(500).send('Failed to accept friend request');
		}
	});
	fastify.post('/api/friend-requests-decline', async (request, reply) => {
		const { nickname, friendNickname } = request.body as {
			nickname: string;
			friendNickname: string;
		};
		if (!nickname || !friendNickname) {
			return reply.status(400).send('Missing nickname or friendNickname');
		}
		try {
			const requestToDecline = await users.getFriendRequestBetween(friendNickname, nickname);
			if (!requestToDecline) {
				return reply.status(404).send('Friend request not found');
			}
			await users.declineFriendRequest(nickname, friendNickname);
			return reply.status(200).send('Friend request declined');
		} catch (err) {
			console.error('Error declining friend request:', err);
			return reply.status(500).send('Failed to decline friend request');
		}
	});
	fastify.post<{ Body: { nickname: string; friendNickname: string } }>(
		'/api/remove-friends',
		async (request, reply) => {
			const { nickname, friendNickname } = request.body;

			if (!nickname || !friendNickname) {
				return reply
					.status(400)
					.send({ message: 'Nickname and Friend Nickname are required' });
			}

			try {
				const group = await users.removeFriend(nickname, friendNickname);
				return reply.status(200).send({ message: 'Friend removed successfully' });
			} catch (error) {
				console.error('Error removing friend:', error);
				return reply.status(500).send({ message: 'Internal server error' });
			}
		}
	);
}
