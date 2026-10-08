import { lobbyAPI } from './api';

interface Player {
	nickname: string;
	tournament_alias?: string;
}

export const inviteMessages = {
	async sendChallengeInvite(from: string, to: Player, matchId: string): Promise<void> {
		const challengeId = matchId;

		await lobbyAPI.sendMessage({
			from,
			to: to.nickname,
			message: `${from} has challenged you to a game!`,
			type: 'challenge_message',
			matchId,
			challengeId,
			extra: {
				instructions: 'Accept or reject the challenge.',
				tournamentSize: 2,
			},
		});
	},

	async sendTournamentInvite(from: string, to: Player, matchId: string): Promise<void> {
		const challengeId = matchId;
		await lobbyAPI.sendMessage({
			from,
			to: to.nickname,
			message: `${from} invited you to a tournament!`,
			type: 'tournament_invite',
			matchId,
			challengeId,
			extra: {
				tournamentSize: 4,
			},
		});
	},

	async sendTournamentCancelled(
		from: string,
		to: Player,
		matchId: string,
		reason?: string
	): Promise<void> {
		const challengeId = matchId;
		await lobbyAPI.sendMessage({
			from,
			to: to.nickname,
			message: reason || `Tournament cancelled: ${from} left the lobby.`,
			challengeId,
			type: 'tournament_cancelled',
			matchId,
		});
	},

	async sendBatchInvites(
		from: string,
		friends: Player[],
		matchId: string,
		isTournament: boolean
	): Promise<{ success: boolean; error?: string }> {
		try {
			const sendFunction = isTournament
				? this.sendTournamentInvite.bind(this)
				: this.sendChallengeInvite.bind(this);

			await Promise.all(friends.map((friend) => sendFunction(from, friend, matchId)));

			return { success: true };
		} catch (error: any) {
			console.error('Error sending invites:', error);
			return {
				success: false,
				error: error.response?.data?.message || 'Failed to send invites',
			};
		}
	},

	async notifyAllTournamentCancelled(
		from: string,
		players: Player[],
		matchId: string,
		reason?: string
	): Promise<void> {
		const notifications = players
			.filter((p) => p.nickname !== from)
			.map((player) => this.sendTournamentCancelled(from, player, matchId, reason));

		await Promise.all(notifications);
	},
};
