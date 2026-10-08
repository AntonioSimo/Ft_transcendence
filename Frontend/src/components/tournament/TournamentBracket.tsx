import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { tournamentAPI } from '../../utils/api';

interface Player {
	id: string;
	name: string;
	isWinner?: boolean;
}

interface Match {
	id: string;
	round: number;
	player1: Player | null;
	player2: Player | null;
	score?: { [playerId: string]: number };
}

export function TournamentBracket() {
	const [tournamentMatches, setTournamentMatches] = useState<Match[]>([]);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	// const location = useLocation();
	// const stateData = location.state as { players?: any[] } | null;
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isUnmountedRef = useRef(false);
	const handledStartGameRef = useRef(false);
	const userId = localStorage.getItem('nickname');
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const tournamentSize = Number(searchParams.get('tournamentSize')) || 4;
	const matchId = searchParams.get('matchId');

	useEffect(() => {
		const initializeBracket = async () => {
			if (!matchId) {
				setTournamentMatches([]);
				return;
			}

			try {
				// Fetch pairs from backend instead of doing shuffle
				const pairsData = await tournamentAPI.getTournamentPairs(matchId);

				// Check if pairs are ready (status 202 = not ready yet)
				if (pairsData.ready === false) {
					if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
					retryTimeoutRef.current = setTimeout(() => {
						if (!isUnmountedRef.current) {
							initializeBracket();
						}
					}, 2000);
					return;
				}

				// Fetch player aliases and match results
				const matchData = await tournamentAPI.getMatchResults(matchId);
				const participants = matchData.participants || [];

				const aliasMap = new Map(
					participants.map((p: any) => [p.nickname, p.tournament_alias])
				);

				// Map SF1 pairs
				const sf1Player1 = {
					id: pairsData.sf1.player1,
					name: aliasMap.get(pairsData.sf1.player1) || pairsData.sf1.player1,
				};
				const sf1Player2 = {
					id: pairsData.sf1.player2,
					name: aliasMap.get(pairsData.sf1.player2) || pairsData.sf1.player2,
				};

				// Map SF2 pairs
				const sf2Player1 = {
					id: pairsData.sf2.player1,
					name: aliasMap.get(pairsData.sf2.player1) || pairsData.sf2.player1,
				};
				const sf2Player2 = {
					id: pairsData.sf2.player2,
					name: aliasMap.get(pairsData.sf2.player2) || pairsData.sf2.player2,
				};

				// Parse scores from backend
				const sf1ScoreData = matchData.sf1Score ? JSON.parse(matchData.sf1Score) : null;
				const sf2ScoreData = matchData.sf2Score ? JSON.parse(matchData.sf2Score) : null;
				const finalScoreData = matchData.finalScore
					? JSON.parse(matchData.finalScore)
					: null;

				if (tournamentSize === 4) {
					// Determine SF winners and final participants
					const sf1Winner = matchData.sf1Winner;
					const sf2Winner = matchData.sf2Winner;
					const finalWinner = matchData.finalWinner;

					const matches = [
						{
							id: 'semi1',
							round: 1,
							player1: { ...sf1Player1, isWinner: sf1Winner === sf1Player1.id },
							player2: { ...sf1Player2, isWinner: sf1Winner === sf1Player2.id },
							score: sf1ScoreData || { [sf1Player1.id]: 0, [sf1Player2.id]: 0 },
						},
						{
							id: 'semi2',
							round: 1,
							player1: { ...sf2Player1, isWinner: sf2Winner === sf2Player1.id },
							player2: { ...sf2Player2, isWinner: sf2Winner === sf2Player2.id },
							score: sf2ScoreData || { [sf2Player1.id]: 0, [sf2Player2.id]: 0 },
						},
						{
							id: 'final',
							round: 2,
							player1: sf1Winner
								? {
										id: sf1Winner,
										name: aliasMap.get(sf1Winner) || sf1Winner,
										isWinner: finalWinner === sf1Winner,
									}
								: null,
							player2: sf2Winner
								? {
										id: sf2Winner,
										name: aliasMap.get(sf2Winner) || sf2Winner,
										isWinner: finalWinner === sf2Winner,
									}
								: null,
							score: finalScoreData || {},
						},
					];
					setTournamentMatches(matches);
				} else if (tournamentSize === 2) {
					setTournamentMatches([
						{
							id: 'final',
							round: 2,
							player1: sf1Player1,
							player2: sf1Player2,
							score: { [sf1Player1.id]: 0, [sf1Player2.id]: 0 },
						},
					]);
				}
			} catch (error) {
				console.error('[TournamentBracket] Error fetching pairs:', error);
				// Fallback if pairs are not calculated yet
				if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = setTimeout(() => {
					if (!isUnmountedRef.current) {
						initializeBracket();
					}
				}, 2000);
			}
		};

		initializeBracket();
		return () => {
			isUnmountedRef.current = true;
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		};
	}, [matchId, tournamentSize, refreshTrigger]);

	const handleStartGameData = useCallback(
		(data: any) => {
			if (!data || !data.lobbyId) return;

			// Ignore events not meant for this user
			if (data.userId && userId && data.userId !== userId) {
				return;
			}

			// Ignore events for other tournaments/matches
			if (matchId && data.matchId && data.matchId !== matchId) {
				return;
			}

			// Prevent re-handling across remounts by persisting a handled key
			const handledKey = `start_game:${data.lobbyId}:${data.matchId || ''}`;
			if (sessionStorage.getItem(handledKey)) {
				return;
			}

			// Avoid double navigation if multiple identical events arrive in the same mount
			if (handledStartGameRef.current) return;
			handledStartGameRef.current = true;
			sessionStorage.setItem(handledKey, 'true');

			const targetMatchId = matchId || data.matchId;
			const roundParam = data.round ? `&round=${encodeURIComponent(data.round)}` : '';
			navigate(
				`/game?lobbyId=${encodeURIComponent(data.lobbyId)}&tournament=true${targetMatchId ? `&matchId=${encodeURIComponent(targetMatchId)}` : ''}${roundParam}`
			);
		},
		[matchId, navigate, userId]
	);

	useEffect(() => {
		const handleStartGame = (e: Event) => handleStartGameData((e as CustomEvent).detail);
		// Handle any queued events that arrived before this component mounted
		const startGameQueue = (window as any).__startGameQueue as any[] | undefined;
		if (startGameQueue && startGameQueue.length) {
			startGameQueue.forEach(handleStartGameData);
			startGameQueue.length = 0;
		}

		window.addEventListener('global:start_game', handleStartGame);
		return () => {
			window.removeEventListener('global:start_game', handleStartGame);
		};
	}, [handleStartGameData]);

	useEffect(() => {
		if (!matchId || !userId) return;

		let cancelled = false;

		const pollForMissedStart = async () => {
			try {
				const matchData = await tournamentAPI.getMatchResults(matchId);
				if (cancelled) return;

				const sf1Player1 = matchData.sf1Player1 as string | undefined;
				const sf1Player2 = matchData.sf1Player2 as string | undefined;
				const sf2Player1 = matchData.sf2Player1 as string | undefined;
				const sf2Player2 = matchData.sf2Player2 as string | undefined;
				const sf1Winner = matchData.sf1Winner as string | undefined;
				const sf2Winner = matchData.sf2Winner as string | undefined;
				const finalWinner = matchData.finalWinner as string | undefined;

				const isInSf1 = userId === sf1Player1 || userId === sf1Player2;
				const isInSf2 = userId === sf2Player1 || userId === sf2Player2;

				if (isInSf1 && !sf1Winner) {
					handleStartGameData({
						lobbyId: `${matchId}-sf1`,
						matchId,
						userId,
						round: 'sf1',
					});
					return;
				}

				if (isInSf2 && !sf2Winner) {
					handleStartGameData({
						lobbyId: `${matchId}-sf2`,
						matchId,
						userId,
						round: 'sf2',
					});
					return;
				}

				if (
					sf1Winner &&
					sf2Winner &&
					!finalWinner &&
					(userId === sf1Winner || userId === sf2Winner)
				) {
					handleStartGameData({
						lobbyId: `${matchId}-final`,
						matchId,
						userId,
						round: 'final',
					});
				}
			} catch (error) {
				console.error('[TournamentBracket] Error polling for start:', error);
			}
		};

		pollForMissedStart();
		const intervalId = window.setInterval(pollForMissedStart, 3000);
		return () => {
			cancelled = true;
			window.clearInterval(intervalId);
		};
	}, [handleStartGameData, matchId, userId]);

	// Listen for tournament match results and refresh bracket
	useEffect(() => {
		const handleMatchResult = (e: Event) => {
			const data = (e as CustomEvent).detail;

			// Only refresh if it's for our tournament
			if (data.matchId === matchId) {
				setRefreshTrigger((prev) => prev + 1);
			}
		};

		window.addEventListener('global:tournament_matchResult', handleMatchResult);
		return () => {
			window.removeEventListener('global:tournament_matchResult', handleMatchResult);
		};
	}, [matchId]);

	const MatchComponent = ({ match }: { match: Match }) => (
		<div className="bg-gray-900 border-2 border-yellow-400 rounded-lg p-3 mb-4 cursor-pointer hover:border-yellow-300 hover:bg-gray-800 transition-all duration-200 min-w-[180px]">
			<div className="space-y-2">
				<div
					className={`flex items-center justify-between p-2 rounded ${
						match.player1?.isWinner
							? 'bg-green-600 text-white'
							: 'bg-gray-700 text-gray-200'
					}`}
				>
					<span className="font-press-start text-xs truncate">
						{match.player1?.name || 'TBD'}
					</span>
					<span className="font-press-start text-xs text-yellow-300 ml-2">
						{match.score?.[match.player1?.id ?? ''] ?? 0}
					</span>
					{match.player1?.isWinner && <span className="text-yellow-300">👑</span>}
				</div>

				<div className="text-center text-yellow-400 font-press-start text-xs">VS</div>

				<div
					className={`flex items-center justify-between p-2 rounded ${
						match.player2?.isWinner
							? 'bg-green-600 text-white'
							: 'bg-gray-700 text-gray-200'
					}`}
				>
					<span className="font-press-start text-xs truncate">
						{match.player2?.name || 'TBD'}
					</span>
					<span className="font-press-start text-xs text-yellow-300 ml-2">
						{match.score?.[match.player2?.id ?? ''] ?? 0}
					</span>
					{match.player2?.isWinner && <span className="text-yellow-300">👑</span>}
				</div>
			</div>
		</div>
	);

	const Bracket8 = () => (
		<div className="flex justify-center items-center space-x-8">
			<div className="flex flex-col space-y-6">
				<div className="text-center mb-4">
					<h3 className="font-press-start text-yellow-400 text-sm">SEMI-FINALS</h3>
				</div>
				{tournamentMatches
					.filter((m) => m.round === 1)
					.map((match) => (
						<MatchComponent key={match.id} match={match} />
					))}
			</div>

			<div className="flex flex-col justify-center space-y-16">
				{[0, 1].map((i) => (
					<div key={i} className="flex items-center">
						<div className="w-6 h-px bg-yellow-400"></div>
						<div className="w-px h-12 bg-yellow-400"></div>
						<div className="w-6 h-px bg-yellow-400"></div>
					</div>
				))}
			</div>

			<div className="flex flex-col space-y-12">
				<div className="text-center mb-4">
					<h3 className="font-press-start text-yellow-400 text-sm">FINAL</h3>
				</div>
				{tournamentMatches
					.filter((m) => m.round === 2)
					.map((match) => (
						<MatchComponent key={match.id} match={match} />
					))}
			</div>

			<div className="flex flex-col items-center justify-center">
				<div className="w-6 h-px bg-yellow-400"></div>
				<div className="w-px h-20 bg-yellow-400"></div>
				<div className="w-6 h-px bg-yellow-400"></div>
			</div>

			<div className="flex flex-col items-center">
				<div className="text-center mb-4">
					<h3 className="font-press-start text-yellow-400 text-sm">CHAMPION</h3>
				</div>
				<div className="bg-gray-900 border-4 border-yellow-400 rounded-lg p-4 shadow-2xl min-w-[200px]">
					<div className="text-center">
						<div className="font-press-start text-lg text-yellow-400 font-bold">
							{(() => {
								const finalMatch = tournamentMatches.find((m) => m.id === 'final');
								if (!finalMatch) return 'TBD';
								if (finalMatch.player1?.isWinner) return finalMatch.player1.name;
								if (finalMatch.player2?.isWinner) return finalMatch.player2.name;
								return 'TBD';
							})()}
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white p-8 font-press-start">
			<button
				onClick={() => navigate('/home')}
				className="absolute top-5 left-5 z-[2000] text-white bg-black/70 border-2 border-yellow-400 px-4 py-2 rounded-lg cursor-pointer text-sm font-bold"
			>
				BACK TO HOME
			</button>

			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-yellow-400 mb-2">TOURNAMENT</h1>
			</div>

			<div className="overflow-x-auto">
				<div className="min-w-fit">
					<Bracket8 />
				</div>
			</div>
		</div>
	);
}
