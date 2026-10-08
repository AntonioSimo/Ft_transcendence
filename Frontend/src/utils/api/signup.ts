import axios from 'axios';
import { createApiUrl } from '../../config/api';

export interface SignupRequest {
	nickname: string;
	email: string;
	password: string;
}

export interface SignupResponse {
	message?: string;
}

export interface SignupError {
	message: string;
	status?: number;
}

function validateSignupFields(nickname: string, email: string, password: string): string | null {
	if (!nickname || !email || !password) {
		return 'Please enter nickname, email and password';
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return 'Invalid email';
	}

	if (password.length < 4) {
		return 'Password must be at least 4 characters long';
	}

	return null;
}

async function signup(data: SignupRequest): Promise<SignupResponse> {
	try {
		const response = await axios.post<SignupResponse>(createApiUrl('/api/signup'), {
			nickname: data.nickname,
			email: data.email,
			password: data.password,
		});
		return response.data;
	} catch (err: any) {
		console.error('Sign Up error:', err);

		if (err.response?.status === 400) {
			const errorMessage = err.response?.data?.message;
			if (errorMessage && errorMessage.includes('email')) {
				throw { message: 'Invalid email', status: 400 } as SignupError;
			}
			if (errorMessage && errorMessage.includes('password')) {
				throw {
					message: 'Password must be at least 4 characters long',
					status: 400,
				} as SignupError;
			}
		}

		if (err.response?.status === 409) {
			const message = err.response?.data?.message;
			if (message === 'Email already in use') {
				throw { message: 'Email already in use', status: 409 } as SignupError;
			}
			if (message === 'Nickname already taken') {
				throw { message: 'Nickname already taken', status: 409 } as SignupError;
			}
		}

		throw {
			message: err.response?.data?.message || 'Sign Up failed. Please try again.',
			status: err.response?.status,
		} as SignupError;
	}
}

function getGoogleAuthUrl(): string {
	return createApiUrl('/api/auth/google');
}

export const signupAPI = {
	signup,
	getGoogleAuthUrl,
	validateSignupFields,
};
