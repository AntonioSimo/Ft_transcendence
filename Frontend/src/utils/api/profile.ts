import axios from 'axios';
import { createApiUrl } from '../../config/api';

export interface ProfileData {
	nickname: string;
	email?: string;
	tournament_alias?: string;
	avatar_id?: string;
	last_loginTime?: string;
	friendsNumber?: number;
	friendsOnline?: number;
	pendingRequests?: number;
	played?: number;
	wins?: number;
}

export const profileAPI = {
	async getProfile(userId: string): Promise<ProfileData> {
		const response = await axios.get(createApiUrl(`/api/profile/${userId}`), {
			withCredentials: true,
		});
		return response.data;
	},

	async uploadAvatar(userId: string, file: File): Promise<ProfileData> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await axios.post(
			createApiUrl(`/api/profile/${userId}/upload-avatar`),
			formData,
			{
				headers: { 'Content-Type': 'multipart/form-data' },
				timeout: 30000,
			}
		);

		return response.data;
	},

	async updateEmail(nickname: string, newEmail: string): Promise<void> {
		await axios.put(
			createApiUrl('/api/update-user-email'),
			{
				nickname,
				newEmail: newEmail.trim(),
			},
			{ withCredentials: true }
		);
	},

	async updateTournamentAlias(nickname: string, newTournamentAlias: string): Promise<void> {
		await axios.put(
			createApiUrl('/api/update-tournament-alias'),
			{
				nickname,
				newTournamentAlias: newTournamentAlias.trim(),
			},
			{ withCredentials: true }
		);
	},

	validation: {
		isValidEmail(email: string): boolean {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailRegex.test(email);
		},

		isValidTournamentAlias(alias: string): boolean {
			const aliasRegex = /^[a-zA-Z0-9_-]{3,20}$/;
			return aliasRegex.test(alias);
		},

		isValidFileSize(file: File): boolean {
			return file.size <= 5 * 1024 * 1024;
		},

		isValidFileType(file: File): boolean {
			const allowedTypes = [
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/gif',
				'image/webp',
			];
			return allowedTypes.includes(file.type);
		},
	},
};
