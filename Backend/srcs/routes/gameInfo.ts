import { FastifyInstance } from 'fastify';
import { MatchStatus } from '@prisma/client';
import * as users from '../../db_functionalities/usersTableFunctions';
import * as group from '../../db_functionalities/groupsTableFunctions';
import * as messages from '../../db_functionalities/messagesTableFunctions';
import * as game from '../../db_functionalities/gameInfoTableFunctions';
import { broadcastChallengeMessage } from './chat';

export async function gameInfo(fastify: FastifyInstance) {
	try {
		await game.expireOldPendingMatches();
	} catch (err) {
		console.error('Error expiring stale matches on startup:', err);
	}

	async function broadcastTournamentStarts(matchId: string) {
		const info = await game.getGameInfoById(matchId);
		if (!info) return;
		if (info.status === MatchStatus.PENDING) {
			await game.markMatchStatus(matchId, MatchStatus.ACTIVE);
		}
		const { sf1Player1, sf1Player2, sf2Player1, sf2Player2 } = info as any;
		if (!sf1Player1 || !sf1Player2 || !sf2Player1 || !sf2Player2) return;

		const pairs = [
			{ lobbyId: `${matchId}-sf1`, p1: sf1Player1, p2: sf1Player2, round: 'sf1' as const },
			{ lobbyId: `${matchId}-sf2`, p1: sf2Player1, p2: sf2Player2, round: 'sf2' as const },
		];

		for (const pair of pairs) {
			broadcastChallengeMessage(pair.p1, {
				type: 'start_game',
				userId: pair.p1,
				lobbyId: pair.lobbyId,
				tournament: true,
				matchId,
				opponent: pair.p2,
				round: pair.round,
			});
			broadcastChallengeMessage(pair.p2, {
				type: 'start_game',
				userId: pair.p2,
				lobbyId: pair.lobbyId,
				tournament: true,
				matchId,
				opponent: pair.p1,
				round: pair.round,
			});
		}
	}

	const tournamentReadyStatus = new Map<string, Set<string>>();
	const tournamentStartBroadcasted = new Set<string>();
	fastify.put<{ Body: { nickname: string | null; win: boolean } }>(
		'/api/update-score-match',
		async (request, reply) => {
			const { nickname, win } = request.body;

			if (!nickname) {
				console.warn('No nickname received in body');
				return reply.code(400).send({ error: 'Nickname is required' });
			}

			try {
				const user = await users.getUserByNickname(nickname);
				if (!user) {
					console.error(`User with nickname "${nickname}" not found.`);
					return reply.code(404).send({ error: 'User not found' });
				}
				const newMatch = await game.createSingleGameId(user.id, 'F');
				if (win) {
					await game.setGameWinner(newMatch.id, user.id);
				}
				reply.code(200).send({ ok: true, matchId: newMatch.id });
			} catch (error) {
				console.error('Error processing match result:', error);
				reply
					.code(500)
					.send({ error: 'Internal server error while updating match score.' });
			}
		}
	);

	// fastify.put<{ Body: { creator: string | null, opponent: string} }>('/api/create-single-match', async (request, reply) => {
	//   if (!request.body.creator || !request.body.opponent) {
	//     return reply.code(400).send({ error: 'Creator and opponent is required' });
	//   }
	//   const creator = request.body.creator;
	//   const opponent = request.body.opponent;
	//   const matchId = await game.createSingleGameId(creator, 'F');
	//   await game.addPlayerToSingleGame(matchId.id, opponent);

	//   reply.code(200).send({ ok: true, matchId: matchId });
	// });

	fastify.put<{ Body: { creator: string | null } }>(
		'/api/create-match',
		async (request, reply) => {
			if (!request.body.creator) {
				return reply.code(400).send({ error: 'Creator is required' });
			}
			const creator = request.body.creator;
			const new_match = await game.createTournament(creator, null);
			reply.code(200).send({ ok: true, matchId: new_match.id });
		}
	);

	fastify.post<{ Body: { matchId: string; winnerId: string; loserId: string } }>(
		'/api/match-result',
		async (request, reply) => {
			const { matchId, winnerId, loserId } = request.body;

			if (!matchId || !winnerId || !loserId) {
				return reply.code(400).send({ error: 'Missing required fields' });
			}

			try {
				const winnerUser = await users.getUserByNickname(winnerId);
				const loserUser = await users.getUserByNickname(loserId);

				if (!winnerUser || !loserUser) {
					return reply.code(404).send({ error: 'Winner or loser not found' });
				}

				const matchInfo = await game.getGameInfoById(matchId);
				if (!matchInfo) {
					return reply.code(404).send({ error: 'Match not found' });
				}

				await game.setGameWinner(matchId, winnerUser.id);

				reply.code(200).send({ ok: true });
			} catch (error: any) {
				console.error('Error saving match result:', error);
				reply.code(500).send({ error: error.message });
			}
		}
	);

	fastify.post<{ Body: { matchId: string; playerNickname: string; tournament_alias?: string } }>(
		'/api/accept-tournament-invite',
		async (request, reply) => {
			const { matchId, playerNickname, tournament_alias } = request.body;

			if (!matchId || !playerNickname) {
				return reply.code(400).send({ error: 'Missing required fields' });
			}

			try {
				await game.expireOldPendingMatches();
				await game.addPlayerToTournament(matchId, playerNickname);

				const matchInfo = await game.getGameInfoById(matchId);
				if (!matchInfo) {
					return reply.code(404).send({ error: 'Match not found' });
				}

				const allParticipants = matchInfo.participants.map((p) => p.nickname);
				const acceptedUser = matchInfo.participants.find(
					(p) => p.nickname === playerNickname
				);

				const playerAlias =
					acceptedUser?.tournament_alias || tournament_alias || playerNickname;

				if (matchInfo.participants.length === 4 && !matchInfo.sf1Player1) {
					try {
						await game.calculateAndSaveTournamentPairs(matchId);
						await game.markMatchStatus(matchId, MatchStatus.ACTIVE);
					} catch (calcError: any) {}
				}

				for (const participant of allParticipants) {
					broadcastChallengeMessage(participant, {
						type: 'player_joined',
						matchId,
						playerNickname,
						playerTournamentAlias: playerAlias, // Use DB alias
						timestamp: Date.now(),
						participants: allParticipants,
					});
				}

				reply.code(200).send({
					ok: true,
					participants: allParticipants,
				});
			} catch (error: any) {
				console.error('Error accepting tournament invite:', error);
				reply.code(500).send({ error: error.message || 'Failed to join tournament' });
			}
			await broadcastTournamentStarts(matchId);
			tournamentStartBroadcasted.add(matchId);
			tournamentReadyStatus.delete(matchId);
		}
	);

	fastify.post<{ Body: { matchId: string; playerNickname: string; creatorNickname: string } }>(
		'/api/decline-tournament-invite',
		async (request, reply) => {
			const { matchId, playerNickname, creatorNickname } = request.body;

			if (!matchId || !playerNickname || !creatorNickname) {
				return reply.code(400).send({ error: 'Missing required fields' });
			}

			try {
				const matchInfo = await game.getGameInfoById(matchId).catch(() => null);
				const participants = matchInfo?.participants?.map((p) => p.nickname) || [];

				await game.markMatchStatus(matchId, MatchStatus.CANCELLED).catch(() => {});
				await game.deleteGameInfoById(matchId);
				tournamentReadyStatus.delete(matchId);
				tournamentStartBroadcasted.delete(matchId);

				const declinePayload = {
					type: 'tournament_invite_declined',
					matchId,
					playerNickname,
					timestamp: Date.now(),
				};

				if (participants.length > 0) {
					for (const participant of participants) {
						broadcastChallengeMessage(participant, declinePayload);
					}
				} else {
					broadcastChallengeMessage(creatorNickname, declinePayload);
				}

				reply.code(200).send({
					ok: true,
					message: 'Tournament cancelled due to declined invite',
				});
			} catch (error: any) {
				reply.code(500).send({ error: error.message || 'Failed to decline invite' });
			}
		}
	);

	fastify.delete<{ Params: { matchId: string } }>(
		'/api/cancel-match/:matchId',
		async (request, reply) => {
			const { matchId } = request.params;

			if (!matchId) {
				return reply.code(400).send({ error: 'Missing matchId' });
			}

			try {
				await game.markMatchStatus(matchId, MatchStatus.CANCELLED).catch(() => {});
				await game.deleteGameInfoById(matchId);
				tournamentReadyStatus.delete(matchId);
				tournamentStartBroadcasted.delete(matchId);
				reply.code(200).send({ ok: true, message: 'Match cancelled successfully' });
			} catch (error: any) {
				reply.code(500).send({ error: error.message || 'Failed to cancel match' });
			}
		}
	);

	fastify.post<{ Body: { matchId: string; playerNickname: string; players: string[] } }>(
		'/api/cancel-tournament',
		async (request, reply) => {
			const { matchId, playerNickname, players } = request.body;

			if (!matchId || !playerNickname || !players) {
				return reply.code(400).send({ error: 'Missing required fields' });
			}

			try {
				await game.markMatchStatus(matchId, MatchStatus.CANCELLED).catch(() => {});
				await game.deleteGameInfoById(matchId);
				tournamentReadyStatus.delete(matchId);
				tournamentStartBroadcasted.delete(matchId);

				for (const player of players) {
					if (player !== playerNickname) {
						broadcastChallengeMessage(player, {
							type: 'tournament_cancelled',
							matchId,
							playerNickname,
							message: `Tournament cancelled: ${playerNickname} left the lobby.`,
							timestamp: Date.now(),
						});
					}
				}

				reply.code(200).send({ ok: true, message: 'Tournament cancelled successfully' });
			} catch (error: any) {
				reply.code(500).send({ error: error.message || 'Failed to cancel tournament' });
			}
		}
	);

	fastify.post<{ Body: { matchId: string; playerNickname: string; isReady: boolean } }>(
		'/api/update-tournament-ready',
		async (request, reply) => {
			const { matchId, playerNickname, isReady } = request.body;

			if (!matchId || !playerNickname || typeof isReady !== 'boolean') {
				return reply.code(400).send({ error: 'Missing required fields' });
			}

			try {
				await game.expireOldPendingMatches();
				const matchInfo = await game.getGameInfoById(matchId);
				if (!matchInfo) {
					return reply.code(404).send({ error: 'Match not found' });
				}

				// Track ready status
				if (!tournamentReadyStatus.has(matchId)) {
					tournamentReadyStatus.set(matchId, new Set());
				}
				const readyPlayers = tournamentReadyStatus.get(matchId)!;

				if (isReady) {
					readyPlayers.add(playerNickname);
				} else {
					readyPlayers.delete(playerNickname);
				}

				const allParticipants = matchInfo.participants.map((p) => p.nickname);
				const allReady =
					allParticipants.length === 4 && readyPlayers.size === allParticipants.length;

				// When everyone is ready, ensure pairs exist and broadcast start_game once
				if (allReady && !tournamentStartBroadcasted.has(matchId)) {
					const pairsMissing =
						!matchInfo.sf1Player1 ||
						!matchInfo.sf1Player2 ||
						!matchInfo.sf2Player1 ||
						!matchInfo.sf2Player2;

					if (pairsMissing) {
						try {
							await game.calculateAndSaveTournamentPairs(matchId);
						} catch (calcError) {
							console.error('Error calculating pairs:', calcError);
						}
					}
					await game.markMatchStatus(matchId, MatchStatus.ACTIVE);
					await broadcastTournamentStarts(matchId);
					tournamentStartBroadcasted.add(matchId);
					tournamentReadyStatus.delete(matchId);
				}

				for (const participant of allParticipants) {
					broadcastChallengeMessage(participant, {
						type: 'tournament_ready_update',
						matchId,
						playerNickname,
						isReady,
						timestamp: Date.now(),
					});
				}

				reply.code(200).send({ ok: true });
			} catch (error) {
				console.error('Error updating ready status:', error);
				reply.code(500).send({ error: 'Failed to update ready status' });
			}
		}
	);
	fastify.get<{ Params: { matchId: string } }>(
		'/api/game-info/:matchId',
		async (request, reply) => {
			const { matchId } = request.params;

			if (!matchId) {
				return reply.code(400).send({ error: 'Match ID is required' });
			}

			try {
				const matchInfo = await game.getGameInfoById(matchId);
				if (!matchInfo) {
					return reply.code(404).send({ error: 'Match not found' });
				}

				reply.code(200).send(matchInfo);
			} catch (error) {
				console.error('Error fetching match info:', error);
				reply.code(500).send({ error: 'Failed to fetch match info' });
			}
		}
	);

	fastify.post<{ Body: { matchId: string; playerNickname: string } }>(
		'/api/leave-tournament',
		async (request, reply) => {
			const { matchId, playerNickname } = request.body;

			if (!matchId || !playerNickname) {
				return reply.code(400).send({ error: 'Missing required fields' });
			}

			try {
				await game.removePlayerFromTournament(matchId, playerNickname);
				const matchInfo = await game.getGameInfoById(matchId);
				if (!matchInfo) {
					return reply.code(404).send({ error: 'Match not found' });
				}

				// If tournament has less than 4 players or pairs not yet calculated, delete tournament
				if (matchInfo.participants.length < 4 || !matchInfo.sf1Player1) {
					await game.markMatchStatus(matchId, MatchStatus.CANCELLED).catch(() => {});
					await game.deleteGameInfoById(matchId);
					tournamentReadyStatus.delete(matchId);
					tournamentStartBroadcasted.delete(matchId);

					// Notify remaining participants
					const allParticipants = matchInfo.participants.map((p) => p.nickname);
					for (const participant of allParticipants) {
						if (participant !== playerNickname) {
							broadcastChallengeMessage(participant, {
								type: 'tournament_cancelled',
								matchId,
								playerNickname,
								message: `Tournament cancelled: ${playerNickname} left the lobby.`,
								timestamp: Date.now(),
							});
						}
					}
				} else {
					// Tournament is complete, just notify about player leaving
					const allParticipants = matchInfo.participants.map((p) => p.nickname);
					for (const participant of allParticipants) {
						broadcastChallengeMessage(participant, {
							type: 'tournament_player_left',
							matchId,
							playerNickname,
							timestamp: Date.now(),
							participants: allParticipants,
						});
					}
				}

				reply.code(200).send({
					ok: true,
					participants: matchInfo.participants.map((p) => p.nickname),
				});
			} catch (error: any) {
				console.error('Error leaving tournament:', error);
				reply.code(500).send({ error: error.message || 'Failed to leave tournament' });
			}
		}
	);

	// Fetch tournament pairs
	fastify.get<{ Params: { matchId: string } }>(
		'/api/tournament-pairs/:matchId',
		async (request, reply) => {
			const { matchId } = request.params;

			if (!matchId) {
				return reply.code(400).send({ error: 'matchId is required' });
			}

			try {
				// Check if match exists and if pairs are calculated
				const matchInfo = await game.getGameInfoById(matchId);
				if (!matchInfo) {
					return reply.code(404).send({ error: 'Match not found' });
				}

				// If pairs not calculated yet, return 202 (Accepted - processing)
				if (!matchInfo.sf1Player1) {
					return reply.code(202).send({
						ready: false,
						message: 'Tournament pairs not calculated yet',
						playersCount: matchInfo.participants?.length || 0,
					});
				}

				const pairs = await game.getTournamentPairs(matchId);
				reply.code(200).send({ ready: true, ...pairs });
			} catch (error: any) {
				console.error('Error fetching tournament pairs:', error);
				reply.code(500).send({ error: error.message });
			}
		}
	);

	fastify.post<{
		Body: { matchId: string; winnerId: string; loserId: string; score: any; round: string };
	}>('/api/tournament-match-result', async (request, reply) => {
		const { matchId, winnerId, loserId, score, round } = request.body;

		if (!matchId || !winnerId || !loserId) {
			return reply.code(400).send({ error: 'Missing required fields' });
		}

		try {
			// Frontend sends nicknames; translate to DB ids to satisfy foreign keys
			const winnerUser = await users.getUserByNickname(winnerId);
			const loserUser = await users.getUserByNickname(loserId);

			if (!winnerUser || !loserUser) {
				return reply.code(404).send({ error: 'Winner or loser not found' });
			}

			const winnerNickname = winnerUser.nickname;
			const loserNickname = loserUser.nickname;
			const winnerDbId = winnerUser.id;

			// Get match info to determine which field to update
			const matchInfo = await game.getGameInfoById(matchId);
			if (!matchInfo) {
				return reply.code(404).send({ error: 'Match not found' });
			}

			let status = matchInfo.status;

			// Align result handling with match lifecycle: only ACTIVE matches can be updated
			if (status === MatchStatus.PENDING) {
				const isExpired = matchInfo.expiresAt && matchInfo.expiresAt < new Date();
				if (isExpired) {
					await game.markMatchStatus(matchId, MatchStatus.EXPIRED).catch(() => {});
					return reply.code(410).send({ error: 'Match invite expired' });
				}

				await game.markMatchStatus(matchId, MatchStatus.ACTIVE).catch(() => {});
				status = MatchStatus.ACTIVE;
			}

			if (status === MatchStatus.CANCELLED || status === MatchStatus.EXPIRED) {
				return reply.code(409).send({ error: `Match not active (status=${status})` });
			}

			if (status === MatchStatus.FINISHED) {
				return reply.code(409).send({ error: 'Match already finished' });
			}

			// Update tournament bracket fields based on round
			if (round === 'sf1') {
				await game.updateGameInfo(matchId, {
					sf1Winner: winnerNickname,
					sf1Score: JSON.stringify(score),
				});
			} else if (round === 'sf2') {
				await game.updateGameInfo(matchId, {
					sf2Winner: winnerNickname,
					sf2Score: JSON.stringify(score),
				});
			} else if (round === 'final') {
				// For final, save result AND update global stats
				await game.updateGameInfo(matchId, {
					finalWinner: winnerNickname,
					finalScore: JSON.stringify(score),
					winnerId: winnerDbId, // Use DB id to satisfy FK and update stats
				});
				await game.markMatchStatus(matchId, MatchStatus.FINISHED).catch(() => {});

				// Broadcast tournament completion
				broadcastChallengeMessage(winnerNickname, {
					type: 'tournament_completed',
					message: `You won the tournament!`,
					matchId,
				});
				broadcastChallengeMessage(loserNickname, {
					type: 'tournament_completed',
					message: `Tournament finished`,
					matchId,
				});
			}

			// Check if both SF winners exist - if so, start the final
			const updatedMatch = await game.getGameInfoById(matchId);
			if (updatedMatch && updatedMatch.sf1Winner && updatedMatch.sf2Winner) {
				// Get aliases for the final participants
				const sf1WinnerAlias =
					updatedMatch.participants?.find((p) => p.nickname === updatedMatch.sf1Winner)
						?.tournament_alias || updatedMatch.sf1Winner;
				const sf2WinnerAlias =
					updatedMatch.participants?.find((p) => p.nickname === updatedMatch.sf2Winner)
						?.tournament_alias || updatedMatch.sf2Winner;

				// Broadcast final start to both winners
				broadcastChallengeMessage(updatedMatch.sf1Winner, {
					type: 'start_game',
					userId: updatedMatch.sf1Winner,
					lobbyId: `${matchId}-final`,
					tournament: true,
					matchId,
					opponent: updatedMatch.sf2Winner,
					round: 'final',
				});
				broadcastChallengeMessage(updatedMatch.sf2Winner, {
					type: 'start_game',
					userId: updatedMatch.sf2Winner,
					lobbyId: `${matchId}-final`,
					tournament: true,
					matchId,
					opponent: updatedMatch.sf1Winner,
					round: 'final',
				});
			}

			// Broadcast to all participants that bracket should update
			const participants = matchInfo.participants || [];
			for (const participant of participants) {
				broadcastChallengeMessage(participant.nickname, {
					type: 'tournament_matchResult',
					matchId,
					winnerId: winnerNickname,
					loserId: loserNickname,
					round,
					score,
				});
			}

			reply.code(200).send({ ok: true });
		} catch (error: any) {
			console.error('Error saving tournament match result:', error);
			reply.code(500).send({ error: error.message });
		}
	});
}
