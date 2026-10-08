import axios from 'axios';
import { createApiUrl } from '../../config/api';

export interface ProfileViewData {
	nickname: string;
	email?: string;
	tournament_alias?: string;
	avatar?: string;
	gamesWon?: number;
	gamesLost?: number;
	friends?: any[];
}

export interface ProfileViewError {
	message: string;
	status?: number;
}

async function getProfileByNickname(nickname: string): Promise<ProfileViewData> {
	const apiUrl = createApiUrl(`/api/profile/${nickname}`);

	try {
		const response = await axios.get<ProfileViewData>(apiUrl, { withCredentials: true });
		return response.data;
	} catch (err: any) {
		console.error('DEBUG: API Request FAILED!', err);

		if (err.response) {
			console.error('DEBUG: Server responded with:', err.response.status, err.response.data);
			throw {
				message: err.response.data.message || 'Failed to load profile.',
				status: err.response.status,
			} as ProfileViewError;
		}

		throw {
			message: 'Network error or server is down.',
		} as ProfileViewError;
	}
}

export const profileViewAPI = {
	getProfileByNickname,
};
