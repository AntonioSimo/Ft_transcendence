import axios from 'axios';
import { createApiUrl } from '../../config/api';
import { checkIfUserBlocked } from './blockedUsers';

export const lobbyAPI = {
	async getGameInfo(matchId: string) {
		const response = await axios.get(createApiUrl(`/api/game-info/${matchId}`), {
			withCredentials: true,
		});
		return response.data;
	},

	async getFriends(nickname: string) {
		const response = await axios.get(createApiUrl('/api/friends'), {
			headers: { 'curr-user': nickname },
			withCredentials: true,
		});
		let friends = [];
		for (let friend of response.data) {
			if (await checkIfUserBlocked(nickname, friend.nickname)) {
				continue;
			} else {
				friends.push({ ...friend });
			}
		}
		return friends;
	},

	async getTournamentAlias(nickname: string) {
		const response = await axios.get(createApiUrl('/api/tournament-alias'), {
			headers: { 'curr-user': nickname },
			withCredentials: true,
		});
		return response.data;
	},

	//   async  createSingleMatch (creator: string | null, opponent: string | null) {
	//   const response = await axios.put(
	//     createApiUrl('/api/create-single-match'),
	//     { creator, opponent },
	//     { withCredentials: true }
	//   );
	//   return response.data;
	// },

	async createMatch(creator: string) {
		const response = await axios.put(
			createApiUrl('/api/create-match'),
			{ creator },
			{ withCredentials: true }
		);
		return response.data;
	},

	async updateTournamentReady(matchId: string, playerNickname: string, isReady: boolean) {
		const response = await axios.post(
			createApiUrl('/api/update-tournament-ready'),
			{ matchId, playerNickname, isReady },
			{ withCredentials: true }
		);
		return response.data;
	},

	async sendMessage(payload: {
		from: string;
		to: string;
		message: string;
		type: string;
		matchId: string;
		challengeId: string;
		extra?: any;
	}) {
		const response = await axios.post(createApiUrl('/api/send-message'), payload, {
			withCredentials: true,
		});
		return response.data;
	},

	async cancelMatch(matchId: string) {
		const response = await axios.delete(createApiUrl(`/api/cancel-match/${matchId}`), {
			withCredentials: true,
		});
		return response.data;
	},

	async leaveTournament(matchId: string, playerNickname: string) {
		const response = await axios.post(
			createApiUrl('/api/leave-tournament'),
			{ matchId, playerNickname },
			{ withCredentials: true }
		);
		return response.data;
	},
};
