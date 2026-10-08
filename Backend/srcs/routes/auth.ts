import { FastifyInstance } from 'fastify';
import { addUser } from '../../utils/add_users';
import {
	updateLastLoginTime,
	updateUserOnlineStatus,
} from '../../db_functionalities/usersTableFunctions';
import { config } from '../config';
import jwt from 'jsonwebtoken';
import axios from 'axios';

export async function auth(fastify: FastifyInstance) {
	fastify.get('/api/auth/google', async (request, reply) => {
		const googleAuthUrl =
			'https://accounts.google.com/o/oauth2/v2/auth?' +
			new URLSearchParams({
				client_id: process.env.GOOGLE_CLIENT_ID!,
				redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
				response_type: 'code',
				scope: 'profile email',
				access_type: 'offline',
				prompt: 'consent',
			});

		return reply.redirect(googleAuthUrl);
	});

	fastify.get('/api/auth/google/callback', async (request, reply) => {
		try {
			const { code } = request.query as { code?: string };

			if (!code) {
				return reply.redirect('https://localhost:5173/auth?error=no_code');
			}

			const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
				client_id: process.env.GOOGLE_CLIENT_ID,
				client_secret: process.env.GOOGLE_CLIENT_SECRET,
				code,
				grant_type: 'authorization_code',
				redirect_uri: process.env.GOOGLE_REDIRECT_URI,
			});

			const { access_token } = tokenResponse.data;

			const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			});

			const { email, name } = userResponse.data;

			if (!email) {
				return reply.redirect('https://localhost:5173/auth?error=no_email');
			}

			let nickname = name?.replace(/\s+/g, '') || email.split('@')[0];

			let attempts = 0;
			const originalNickname = nickname;
			let newUser;

			while (attempts < 10) {
				try {
					newUser = await addUser({
						nickname,
						email,
						OAuth2: 'google',
					});
					break;
				} catch (error: any) {
					if (error.message === 'EMAIL_EXISTS') {
						const userData = encodeURIComponent(
							JSON.stringify({
								nickname: nickname,
								email: email,
								OAuth2: 'google',
							})
						);

						// Generate JWT token
						const secret: jwt.Secret = config.jwt.secret;
						const expiration = config.jwt.expiration as jwt.SignOptions['expiresIn'];
						const token = jwt.sign({ nickname, email }, secret, {
							expiresIn: expiration,
						});

						reply.setCookie('token', token, {
							httpOnly: true,
							secure: true,
							sameSite: 'lax',
							path: '/',
							maxAge: 60 * 60 * 24,
						});

						reply.setCookie('user_nickname', nickname, {
							httpOnly: true,
							secure: false,
							sameSite: 'lax',
							maxAge: 24 * 60 * 60 * 1000,
						});

						await updateUserOnlineStatus(nickname, true);
						await updateLastLoginTime(nickname, new Date());

						return reply.redirect(
							`https://localhost:5173/auth/callback?user=${userData}`
						);
					} else if (error.message === 'NICKNAME_EXISTS') {
						attempts++;
						nickname = `${originalNickname}${attempts}`;
					} else {
						console.error('Unexpected error creating user:', error);
						return reply.redirect('https://localhost:5173/auth?error=signup_failed');
					}
				}
			}

			if (!newUser && attempts >= 10) {
				return reply.redirect('https://localhost:5173/auth?error=nickname_unavailable');
			}

			// Generate JWT token
			const secret: jwt.Secret = config.jwt.secret;
			const expiration = config.jwt.expiration as jwt.SignOptions['expiresIn'];
			const token = jwt.sign({ nickname: newUser!.nickname, email: newUser!.email }, secret, {
				expiresIn: expiration,
			});

			reply.setCookie('token', token, {
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				path: '/',
				maxAge: 60 * 60 * 24,
			});

			reply.setCookie('user_nickname', newUser!.nickname, {
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
				maxAge: 24 * 60 * 60 * 1000,
			});

			await updateUserOnlineStatus(newUser!.nickname, true);

			const userData = encodeURIComponent(
				JSON.stringify({
					nickname: newUser!.nickname,
					email: newUser!.email,
					OAuth2: newUser!.OAuth2,
				})
			);
			return reply.redirect(`https://localhost:5173/auth/callback?user=${userData}`);
		} catch (error) {
			console.error('Google OAuth callback error:', error);
			return reply.redirect('https://localhost:5173/auth?error=callback_failed');
		}
	});
}
