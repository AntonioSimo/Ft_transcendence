import { FastifyInstance, FastifyReply } from 'fastify';
import { getProfileData } from '../../utils/profile';
import {
	updateUserAvatar,
	updateUserEmail,
	updateUserTournamentAlias,
} from '../../db_functionalities/usersTableFunctions';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import crypto from 'crypto';

const pump = promisify(pipeline);

function sendError(reply: FastifyReply, status: number, message: string) {
	return reply.status(status).send({ success: false, message });
}

export async function profile(fastify: FastifyInstance) {
	fastify.get<{ Params: { nickname: string } }>('/api/profile/:nickname', async (req, reply) => {
		const { nickname } = req.params;
		if (!nickname) return sendError(reply, 400, 'Nickname is required');

		try {
			const profile = await getProfileData(nickname);
			if (!profile) return sendError(reply, 404, 'Profile not found');
			return { success: true, ...profile };
		} catch (err) {
			console.error('Profile fetch error:', err);
			return sendError(reply, 500, 'Internal server error');
		}
	});
	fastify.put<{ Params: { nickname: string }; Body: { avatarId: string } }>(
		'/api/profile/:nickname/avatar',
		async (req, reply) => {
			const { nickname } = req.params;
			const { avatarId } = req.body;
			if (!nickname || !avatarId)
				return sendError(reply, 400, 'Nickname and avatarId are required');

			try {
				const avatarsDir = path.join(__dirname, '../../avatars');
				const avatarPath = path.join(avatarsDir, avatarId);

				if (!fs.existsSync(avatarPath))
					return sendError(reply, 400, 'Avatar file not found');

				const updatedUser = await updateUserAvatar(nickname, avatarId);
				return {
					success: true,
					message: 'Avatar updated successfully',
					avatar_id: updatedUser.avatar_id,
				};
			} catch (err) {
				console.error('Error updating avatar:', err);
				return sendError(reply, 500, 'Internal server error while updating avatar');
			}
		}
	);
	fastify.post<{ Params: { nickname: string } }>(
		'/api/profile/:nickname/upload-avatar',
		async (req, reply) => {
			const { nickname } = req.params;
			if (!nickname) return sendError(reply, 400, 'Nickname is required');

			try {
				const data = await req.file();
				if (!data) return sendError(reply, 400, 'No file uploaded');

				const allowedMimes = [
					'image/jpeg',
					'image/jpg',
					'image/png',
					'image/gif',
					'image/webp',
				];
				if (!allowedMimes.includes(data.mimetype))
					return sendError(reply, 400, 'Invalid file type');

				const ext = path.extname(data.filename || '.jpg').toLowerCase();
				const uniqueFileName = `${nickname}-${crypto.randomUUID()}${ext}`;
				const avatarsDir = path.join(__dirname, '../../avatars');
				if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

				const filePath = path.join(avatarsDir, uniqueFileName);
				await pump(data.file, fs.createWriteStream(filePath));

				await updateUserAvatar(nickname, uniqueFileName);
				const profile = await getProfileData(nickname);

				return { success: true, message: 'Avatar uploaded successfully', ...profile };
			} catch (err) {
				console.error('Error uploading avatar:', err);
				return sendError(reply, 500, 'Internal server error during file upload');
			}
		}
	);
	fastify.put<{ Body: { nickname: string; newEmail: string } }>(
		'/api/update-user-email',
		async (req, reply) => {
			const { nickname, newEmail } = req.body;
			if (!nickname || !newEmail)
				return sendError(reply, 400, 'Nickname and newEmail are required');

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(newEmail)) return sendError(reply, 400, 'Invalid email format');

			try {
				await updateUserEmail(nickname, newEmail);
				return { success: true, message: 'Email updated successfully', newEmail };
			} catch (err: any) {
				console.error('Error updating email:', err);
				if (err.message.includes('already exists'))
					return sendError(reply, 409, 'Email already exists');
				if (err.message.includes('OAuth2'))
					return sendError(reply, 403, 'Cannot change email for Google OAuth2 users');
				return sendError(reply, 500, 'Internal server error while updating email');
			}
		}
	);
	fastify.put<{ Body: { nickname: string; newTournamentAlias: string } }>(
		'/api/update-tournament-alias',
		async (req, reply) => {
			const { nickname, newTournamentAlias } = req.body;
			if (!nickname || !newTournamentAlias)
				return sendError(reply, 400, 'Nickname and newTournamentAlias are required');

			const aliasRegex = /^[a-zA-Z0-9_-]{3,20}$/;
			if (!aliasRegex.test(newTournamentAlias))
				return sendError(reply, 400, 'Invalid tournament alias');

			try {
				await updateUserTournamentAlias(nickname, newTournamentAlias);
				return {
					success: true,
					message: 'Tournament alias updated successfully',
					newTournamentAlias,
				};
			} catch (err: any) {
				console.error('Error updating tournament alias:', err);
				if (err.message.includes('already exists'))
					return sendError(reply, 409, 'Tournament alias already exists');
				return sendError(
					reply,
					500,
					'Internal server error while updating tournament alias'
				);
			}
		}
	);
}
