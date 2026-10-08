import axios from 'axios';
import { createApiUrl } from '../../config/api';

export interface TournamentParticipant {
	id: string;
	nickname: string;
	tournament_alias?: string;
}

export interface TournamentMatchData {
	participants: TournamentParticipant[];
}

export interface CreateMatchResponse {
	matchId: string;
}

export interface AcceptInviteResponse {
	matchId: string;
}

export interface TournamentPairsResponse {
	sf1: { player1: string; player2: string };
	sf2: { player1: string; player2: string };
}

export const tournamentAPI = {
	async createMatch(creator: any): Promise<CreateMatchResponse> {
		const response = await axios.put<CreateMatchResponse>(
			createApiUrl('/api/create-match'),
			{ creator },
			{ withCredentials: true }
		);
		return response.data;
	},

	async acceptTournamentInvite(
		matchId: string | null,
		playerNickname: string | null,
		tournamentAlias?: string | null
	): Promise<AcceptInviteResponse> {
		const response = await axios.post<AcceptInviteResponse>(
			createApiUrl('/api/accept-tournament-invite'),
			{
				matchId,
				playerNickname,
				tournament_alias: tournamentAlias || playerNickname,
			},
			{ withCredentials: true }
		);
		return response.data;
	},

	async declineTournamentInvite(
		matchId: string,
		playerNickname: string,
		creatorNickname: string
	) {
		const response = await axios.post(
			createApiUrl('/api/decline-tournament-invite'),
			{
				matchId,
				playerNickname,
				creatorNickname,
			},
			{ withCredentials: true }
		);
		return response.data;
	},

	// ← NEW: Fetch tournament pairs from backend
	async getTournamentPairs(matchId: string): Promise<TournamentPairsResponse> {
		const response = await axios.get<TournamentPairsResponse>(
			createApiUrl(`/api/tournament-pairs/${matchId}`),
			{ withCredentials: true }
		);
		return response.data;
	},

	async getMatchResults(matchId: string) {
		const response = await axios.get(createApiUrl(`/api/game-info/${matchId}`), {
			withCredentials: true,
		});
		return response.data;
	},

	async getTournamentBracket(lobbyId: string) {
		return { action: 'getTournamentBracket', id: lobbyId };
	},
};
