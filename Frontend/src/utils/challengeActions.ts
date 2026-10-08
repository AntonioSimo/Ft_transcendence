import { challengeAPI } from './api/challenge';

export const challengeActions = {
	async acceptChallenge(
		messageId: string,
		from: string,
		matchId: string
	): Promise<{ success: boolean; matchId?: string; error?: string }> {
		try {
			const res = await challengeAPI.acceptChallenge(messageId, from, matchId);
			return { success: true, matchId: res.matchId };
		} catch (error: any) {
			return {
				success: false,
				error: error.response?.data?.message || 'Failed to accept challenge',
			};
		}
	},

	async declineChallenge(
		challengeId: string,
		currentUser: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			await challengeAPI.rejectChallenge(challengeId, currentUser);
			return { success: true };
		} catch (error: any) {
			return {
				success: false,
				error: error.response?.data?.message || 'Failed to decline challenge',
			};
		}
	},
};
