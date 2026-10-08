import { FastifyInstance, FastifyRequest } from 'fastify';
import speakeasy from 'speakeasy';
import {
	updateLastLoginTime,
	updateUserOnlineStatus,
} from '../../db_functionalities/usersTableFunctions';
import qrcode from 'qrcode';
import prisma from '../../db_functionalities/prismaClient';
import crypto from 'crypto';

declare module 'fastify' {
	interface FastifyRequest {
		user: {
			nickname: string;
		};
	}
}

const KEY = crypto.createHash('sha256').update(process.env.TFA_KEY!).digest();

function encrypt(secret: string) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);

	const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);

	const tag = cipher.getAuthTag();

	return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload: string) {
	const buffer = Buffer.from(payload, 'base64');

	const iv = buffer.subarray(0, 12);
	const tag = buffer.subarray(12, 28);
	const encrypted = buffer.subarray(28);

	const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
	decipher.setAuthTag(tag);

	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export async function twoFA(fastify: FastifyInstance) {
	fastify.get('/api/2fa/setup', async (request: FastifyRequest, reply) => {
		try {
			let secret: speakeasy.GeneratedSecret | null;
			const { nickname } = request.query as { nickname: string };

			let qr_return = false;
			const user_secret = await prisma.user.findUnique({
				where: { nickname },
				select: { TwoFA_secret: true },
			});
			if (!user_secret || user_secret.TwoFA_secret === null) {
				qr_return = true;
				secret = speakeasy.generateSecret({ name: `Transcendence (${nickname})` });
				const encryptedSecret = encrypt(secret.base32);
				await prisma.user.update({
					where: { nickname },
					data: { TwoFA_secret: encryptedSecret },
				});
			} else {
				const base32 = user_secret.TwoFA_secret;
				const decryptedBase32 = decrypt(base32);
				secret = {
					ascii: '',
					hex: '',
					base32: decryptedBase32,
					otpauth_url: speakeasy.otpauthURL({
						secret: decryptedBase32,
						encoding: 'base32',
						label: `Transcendence (${nickname})`,
					}),
				} as speakeasy.GeneratedSecret;
			}

			if (!secret || !secret.otpauth_url) {
				return reply.status(500).send({ error: 'Failed to generate otpauth_url' });
			}

			const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

			if (qr_return) return { qrCodeUrl };
			else return { qrCodeUrl: null };
		} catch (error) {
			console.error('2FA Setup Error:', error);
			return reply.status(500).send({ error: 'Internal server error during 2FA setup' });
		}
	});

	fastify.post('/api/2fa/verify', async (request, reply) => {
		const { token, nickname } = request.body as { token: string; nickname?: string };

		if (!token || !nickname) {
			return reply.status(400).send({ error: 'Token and secret are required' });
		}

		const user = await prisma.user.findUnique({
			where: { nickname },
			select: { TwoFA_secret: true },
		});

		if (!user || !user.TwoFA_secret) {
			return reply.status(400).send({ error: '2FA secret not found' });
		}
		const decryptedSecret = decrypt(user.TwoFA_secret);
		const verified = speakeasy.totp.verify({
			secret: decryptedSecret,
			encoding: 'base32',
			token,
		});

		if (verified && nickname) {
			await updateUserOnlineStatus(nickname, true);
			await updateLastLoginTime(nickname, new Date());
		}

		return { verified };
	});
}
