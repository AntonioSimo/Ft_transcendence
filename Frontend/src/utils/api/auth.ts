import axios from 'axios';
import { createApiUrl } from '../../config/api';

export type LoginResponse = {
	user: {
		nickname: string;
	};
};

export const authAPI = {
	async login(emailNickname: string, password: string): Promise<LoginResponse> {
		const response = await axios.post<LoginResponse>(
			createApiUrl('/api/login'),
			{
				email_nickname: emailNickname,
				password,
			},
			{ withCredentials: true }
		);
		return response.data;
	},

	async logout(nickname: string) {
		const response = await axios.post(
			createApiUrl('/api/logout'),
			{ nickname },
			{ withCredentials: true }
		);
		localStorage.setItem('is2FAVerified', 'false');
		return response.data;
	},

	getGoogleAuthUrl() {
		return createApiUrl('/api/auth/google');
	},
};
