import { MatchStatus } from '@prisma/client';
import prisma from './prismaClient';

const MATCH_PENDING_TTL_MINUTES = 10;
const NON_JOINABLE_STATUSES = new Set<MatchStatus>([
	MatchStatus.CANCELLED,
	MatchStatus.EXPIRED,
	MatchStatus.FINISHED,
]);

const computeExpiryDate = (minutes = MATCH_PENDING_TTL_MINUTES) =>
	new Date(Date.now() + minutes * 60 * 1000);

const isExpiredPending = (expiresAt: Date | null, status: MatchStatus) =>
	status === MatchStatus.PENDING && !!expiresAt && expiresAt < new Date();

export async function expireOldPendingMatches(now = new Date()) {
	await prisma.matchInfo.updateMany({
		where: {
			status: MatchStatus.PENDING,
			winnerId: null,
			expiresAt: { lte: now },
		},
		data: { status: MatchStatus.EXPIRED },
	});
}

export async function getPlayedAndWinsByUserId(userId: string) {
	await expireOldPendingMatches();

	const [played, wins] = await Promise.all([
		prisma.matchInfo.count({
			where: {
				participants: { some: { id: userId } },
				status: MatchStatus.FINISHED,
			},
		}),
		prisma.matchInfo.count({
			where: { winnerId: userId, status: MatchStatus.FINISHED },
		}),
	]);
	return { played, wins };
}

export async function createSingleGameId(creatorId: string, whichGame: 'SF1' | 'SF2' | 'F') {
	const players = [creatorId];
	const match = await prisma.matchInfo.create({
		data: {
			gameType: whichGame,
			status: MatchStatus.PENDING,
			expiresAt: computeExpiryDate(),
			participants: { connect: players.map((id) => ({ id })) },
			createdAt: new Date(),
		},
	});
	return match;
}

export async function setGameWinner(matchId: string, winnerId: string) {
	await prisma.matchInfo.update({
		where: { id: matchId },
		data: { winnerId, status: MatchStatus.FINISHED, expiresAt: null },
	});
}

export async function getGameInfoById(matchId: string) {
	return await prisma.matchInfo.findUnique({
		where: { id: matchId },
		include: {
			participants: {
				select: { id: true, nickname: true, avatar_id: true, tournament_alias: true },
			},
			winner: { select: { id: true, nickname: true } },
		},
	});
}

export async function createTournament(nickname: string, gameType: null) {
	const players = [nickname];
	const user = await prisma.user.findUnique({ where: { nickname: nickname } });
	if (!user) throw new Error('User not found');

	return await prisma.matchInfo.create({
		data: {
			participants: { connect: players.map((id) => ({ id: user.id })) },
			gameType: gameType,
			createdAt: new Date(),
			status: MatchStatus.PENDING,
			expiresAt: computeExpiryDate(),
		},
	});
}

export async function addPlayerToTournament(matchId: string, playerNickname: string) {
	if (!matchId || !playerNickname) throw new Error('matchId and playerNickname are required');

	const match = await prisma.matchInfo.findUnique({
		where: { id: matchId },
		include: { participants: true },
	});

	if (!match) throw new Error('Match not found');
	if (isExpiredPending(match.expiresAt, match.status)) {
		await markMatchStatus(matchId, MatchStatus.EXPIRED);
		throw new Error('Match invite expired');
	}
	if (NON_JOINABLE_STATUSES.has(match.status as MatchStatus)) {
		throw new Error('Match is not joinable');
	}
	const isAlreadyParticipant = match.participants.some((p) => p.nickname === playerNickname);

	if (isAlreadyParticipant) {
		throw new Error('Player already in tournament');
	}

	if (match.participants.length >= 4) {
		throw new Error('Tournament is already full');
	}
	const user = await prisma.user.findUnique({ where: { nickname: playerNickname } });
	if (!user) throw new Error('User not found');
	await prisma.matchInfo.update({
		where: { id: matchId },
		data: {
			participants: {
				connect: { id: user.id },
			},
			status: match.participants.length + 1 >= 4 ? MatchStatus.ACTIVE : match.status,
			expiresAt: match.participants.length + 1 >= 4 ? null : match.expiresAt,
		},
	});
}

export async function removePlayerFromTournament(matchId: string, playerNickname: string) {
	const user = await prisma.user.findUnique({ where: { nickname: playerNickname } });
	if (!user) throw new Error('User not found');
	await prisma.matchInfo.update({
		where: { id: matchId },
		data: {
			participants: {
				disconnect: { id: user.id },
			},
		},
	});
}

export async function getTournamentGamesByType(gameType: 'SF1' | 'SF2' | 'F') {
	return await prisma.matchInfo.findMany({
		where: { gameType },
		include: {
			participants: { select: { id: true, nickname: true, avatar_id: true } },
			winner: { select: { id: true, nickname: true } },
		},
		orderBy: { createdAt: 'desc' },
	});
}

export async function deleteGameInfoById(matchId: string) {
	const existing = await prisma.matchInfo.findUnique({
		where: { id: matchId },
	});
	if (!existing) {
		return null;
	}
	try {
		await prisma.matchInfo.delete({
			where: { id: matchId },
		});
	} catch (error: any) {
		// If it was deleted concurrently, treat as success
		if (error?.code === 'P2025') return null;
		throw error;
	}
}

export async function getUsersInTheGame(matchId: string) {
	const match = await prisma.matchInfo.findUnique({
		where: { id: matchId },
		include: {
			participants: { select: { id: true, nickname: true, tournament_alias: true } },
		},
	});
	return match?.participants || [];
}

// Deterministic shuffle (Fisher-Yates)
export function deterministicShuffle(array: any[], seed: string): any[] {
	const seededRandom = (seed: string) => {
		let hash = 0;
		for (let i = 0; i < seed.length; i++) {
			hash = (hash << 5) - hash + seed.charCodeAt(i);
			hash = hash & hash;
		}
		return () => {
			hash = (hash * 9301 + 49297) % 233280;
			return Math.abs(hash) / 233280; // ← USE Math.abs() to ensure positive
		};
	};

	const result = array.slice();
	const random = seededRandom(seed);

	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		const temp = result[i];
		result[i] = result[j];
		result[j] = temp;
	}

	return result;
}

// Obliczanie i zapisywanie par turnieju
export async function calculateAndSaveTournamentPairs(matchId: string) {
	const match = await prisma.matchInfo.findUnique({
		where: { id: matchId },
		include: { participants: { select: { nickname: true } } },
	});

	if (!match) throw new Error('Match not found');
	if (isExpiredPending(match.expiresAt, match.status)) {
		await markMatchStatus(matchId, MatchStatus.EXPIRED);
		throw new Error('Match invite expired');
	}
	if (NON_JOINABLE_STATUSES.has(match.status as MatchStatus)) {
		throw new Error('Match not joinable');
	}
	if (match.participants.length !== 4) {
		throw new Error(`Tournament must have exactly 4 players, got ${match.participants.length}`);
	}

	const sorted = [...match.participants].sort((a, b) => a.nickname.localeCompare(b.nickname));

	const shuffled = deterministicShuffle(sorted, matchId);

	const updated = await prisma.matchInfo.update({
		where: { id: matchId },
		data: {
			sf1Player1: shuffled[0].nickname,
			sf1Player2: shuffled[1].nickname,
			sf2Player1: shuffled[2].nickname,
			sf2Player2: shuffled[3].nickname,
		},
	});

	return {
		sf1: { player1: shuffled[0].nickname, player2: shuffled[1].nickname },
		sf2: { player1: shuffled[2].nickname, player2: shuffled[3].nickname },
	};
}
export async function getTournamentPairs(matchId: string) {
	const match = await prisma.matchInfo.findUnique({
		where: { id: matchId },
		select: {
			sf1Player1: true,
			sf1Player2: true,
			sf2Player1: true,
			sf2Player2: true,
		},
	});

	if (!match) throw new Error('Match not found');
	if (!match.sf1Player1) throw new Error('Tournament pairs not calculated yet');

	return {
		sf1: { player1: match.sf1Player1, player2: match.sf1Player2 },
		sf2: { player1: match.sf2Player1, player2: match.sf2Player2 },
	};
}
export async function updateGameInfo(matchId: string, data: any) {
	const updated = await prisma.matchInfo.update({
		where: { id: matchId },
		data,
	});
	return updated;
}

export async function markMatchStatus(matchId: string, status: MatchStatus) {
	return prisma.matchInfo.update({
		where: { id: matchId },
		data: {
			status,
			...(status === MatchStatus.ACTIVE ? { expiresAt: null } : {}),
		},
	});
}
