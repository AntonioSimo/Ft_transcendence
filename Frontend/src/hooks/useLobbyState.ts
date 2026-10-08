import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { lobbyAPI } from '../utils/api';
import { inviteMessages } from '../utils/inviteMessages';

interface Player {
	nickname: string;
	status: 'READY' | 'WAITING';
	isOnline: boolean;
	tournament_alias?: string;
}

export function useLobbyState() {
	const location = useLocation();
	const navigate = useNavigate();
	const params = new URLSearchParams(location.search);

	const nickname = localStorage.getItem('nickname') || 'PLAYER';
	const [matchId, setMatchId] = useState<string | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreator, setIsCreator] = useState(false);
	const [showFriendSelection, setShowFriendSelection] = useState(false);
	const [allFriends, setAllFriends] = useState<Player[]>([]);
	const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
	const [acceptedPlayers, setAcceptedPlayers] = useState<Set<string>>(new Set());
	const [inviteTimeoutId, setInviteTimeoutId] = useState<NodeJS.Timeout | null>(null);
	const hasInitialized = useRef(false);
	const wsRef = useRef<WebSocket | null>(null);

	const [size, setSize] = useState(2);
	const [FRIENDS_SIZE, setFriendsSize] = useState(1);
	const [MAX_FRIENDS_SIZE, setMaxFriendsSize] = useState(2);

	const readyCount = players.filter((p) => p.status === 'READY').length;
	const allPlayersHaveAlias = players.length === size && players.every((p) => p.tournament_alias);
	const canStartTournament = readyCount === size && allPlayersHaveAlias;

	// Redirect to TournamentBracket when all players are READY and have aliases
	useEffect(() => {
		if (canStartTournament && matchId) {
			wsRef.current?.send(
				JSON.stringify({
					action: 'tournament_join',
					lobbyId: matchId,
					userId: nickname,
				})
			);

			// Pass players data via state to avoid race conditions
			navigate(`/tournament-bracket?tournamentSize=${size}&matchId=${matchId}`, {
				state: {
					lobbyId: matchId,
					players: players.map((p) => ({
						id: p.nickname,
						nickname: p.nickname,
						tournament_alias: p.tournament_alias || p.nickname,
					})),
				},
			});
		}
	}, [canStartTournament, matchId, navigate, size, nickname]);

	// Sync players periodically
	useEffect(() => {
		if (!matchId) return;

		const syncPlayers = async () => {
			try {
				const matchData = await lobbyAPI.getGameInfo(matchId);

				if (matchData?.participants) {
					const dbPlayers: Player[] = matchData.participants.map((p: any) => {
						return {
							nickname: p.nickname,
							tournament_alias: p.tournament_alias,
							status: 'READY' as const,
							isOnline: true,
						};
					});

					if (dbPlayers.length !== players.length) {
						setPlayers(dbPlayers);
					}
				}
			} catch (error) {
				console.error('Error syncing players:', error);
			}
		};

		syncPlayers();
		const interval = setInterval(syncPlayers, 3000);

		return () => clearInterval(interval);
	}, [matchId, players.length]);

	// Initialize tournament on mount
	useEffect(() => {
		const urlMatchId = params.get('matchId');

		if (urlMatchId) {
			setMatchId(urlMatchId);
			setIsCreator(false);
			loadExistingTournament(urlMatchId);
		} else if (!hasInitialized.current) {
			hasInitialized.current = true;
			setIsCreator(true);
			const tournamentMode = params.has('tournament');
			const lobbySize = tournamentMode ? 4 : 2;
			setSize(lobbySize);
			setFriendsSize(Math.max(1, lobbySize - 1));
			setMaxFriendsSize(lobbySize);
			initializeTournament();
		}
	}, []);

	async function loadExistingTournament(matchIdParam: string) {
		try {
			setLoading(true);
			const matchData = await lobbyAPI.getGameInfo(matchIdParam);

			if (matchData?.participants) {
				const tournamentMode = params.has('tournament');
				const participantCount = matchData.participants.length;
				const gameType = matchData.gameType;
				const lobbySize = tournamentMode
					? 4
					: gameType === 'SF1' || gameType === 'SF2' || participantCount > 2
						? 4
						: 2;
				setSize(lobbySize);
				setFriendsSize(Math.max(1, lobbySize - 1));
				setMaxFriendsSize(lobbySize);

				const participantsList: Player[] = matchData.participants.map((p: any) => {
					return {
						nickname: p.nickname,
						tournament_alias: p.tournament_alias,
						status: 'READY' as const,
						isOnline: true,
					};
				});
				setPlayers(participantsList);
			}

			const friendsData = await lobbyAPI.getFriends(nickname);
			const friends: Player[] = friendsData.map((friend: any) => ({
				nickname: friend.nickname,
				tournament_alias: friend.tournament_alias,
				status: 'WAITING' as const,
				isOnline: friend.status || friend.is_online || false,
			}));
			setAllFriends(friends);

			// Don't automatically set user to READY - let them click the button
		} finally {
			setLoading(false);
		}
	}

	async function initializeTournament() {
		setLoading(true);

		const matchData = await lobbyAPI.createMatch(nickname);
		if (!matchData.ok) return;

		const newMatchId = matchData.matchId;
		setMatchId(newMatchId);

		const [friendsData, aliasData] = await Promise.all([
			lobbyAPI.getFriends(nickname),
			lobbyAPI.getTournamentAlias(nickname),
		]);

		const friends: Player[] = friendsData.map((friend: any) => ({
			nickname: friend.nickname,
			tournament_alias: friend.tournament_alias,
			status: 'WAITING' as const,
			isOnline: friend.status || friend.is_online || false,
		}));

		setAllFriends(friends);

		const initialPlayer = {
			nickname,
			tournament_alias: aliasData.tournament_alias || nickname,
			status: 'READY' as const,
			isOnline: true,
		};

		setPlayers([initialPlayer]);
		setShowFriendSelection(true);
		setLoading(false);
	}

	async function sendTournamentInvites(friends: Player[], matchId: string) {
		setAcceptedPlayers(new Set());

		const isTournament = FRIENDS_SIZE > 1;

		const result = await inviteMessages.sendBatchInvites(
			nickname,
			friends,
			matchId,
			isTournament
		);

		if (!result.success) {
			return result.error || 'Failed to send invites';
		}

		setShowFriendSelection(false);
		if (inviteTimeoutId) clearTimeout(inviteTimeoutId);

		// Auto-set creator as READY for tournaments
		if (isTournament) {
			await lobbyAPI.updateTournamentReady(matchId, nickname, true);
			setPlayers((prev) =>
				prev.map((player) =>
					player.nickname === nickname ? { ...player, status: 'READY' } : player
				)
			);
		}

		if (FRIENDS_SIZE === 1) {
			navigate(`/game?matchId=${encodeURIComponent(matchId)}&mode=direct`);
			return null;
		}

		const timeoutId = setTimeout(() => {
			setAcceptedPlayers((accepted) => {
				if (accepted.size < FRIENDS_SIZE) {
					cancelTournamentMatch(matchId);
				}
				return accepted;
			});
		}, 60000);

		setInviteTimeoutId(timeoutId);
		return null;
	}

	async function cancelTournamentMatch(matchIdToCancel: string) {
		try {
			await lobbyAPI.leaveTournament(matchIdToCancel, nickname);
			await inviteMessages.notifyAllTournamentCancelled(
				nickname,
				players,
				matchIdToCancel,
				'Tournament cancelled: not all players accepted in time.'
			);
			return 'Tournament cancelled: not all players accepted in time.';
		} catch (error: any) {
			console.error('Error cancelling tournament:', error);
			navigate('/home');
			return error.response?.status === 404 || error.response?.status === 500
				? 'Tournament was cancelled.'
				: 'Failed to cancel tournament.';
		}
	}

	const toggleFriendSelection = (friendNickname: string) => {
		setSelectedFriends((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(friendNickname)) {
				newSet.delete(friendNickname);
			} else if (newSet.size < FRIENDS_SIZE) {
				newSet.add(friendNickname);
			} else {
				return prev;
			}
			return newSet;
		});
	};

	const handleSendInvites = async () => {
		if (selectedFriends.size !== FRIENDS_SIZE) {
			return `Select ${FRIENDS_SIZE} ${FRIENDS_SIZE === 1 ? 'friend' : 'friends'}!`;
		}
		if (!matchId) {
			return `Match ID doesn't exist!`;
		}
		const selectedPlayers = allFriends.filter((f) => selectedFriends.has(f.nickname));
		return await sendTournamentInvites(selectedPlayers, matchId);
	};

	const handleLeaveTournament = async () => {
		if (!matchId || !nickname) {
			navigate('home');
			return;
		}
		try {
			if (matchId && nickname) {
				if (players.length < MAX_FRIENDS_SIZE) {
					await lobbyAPI.cancelMatch(matchId);
					await inviteMessages.notifyAllTournamentCancelled(
						nickname,
						players,
						matchId,
						`Tournament cancelled: ${nickname} left the lobby.`
					);
				} else {
					await lobbyAPI.leaveTournament(matchId, nickname);
				}
			}
		} catch (error: any) {
			if (error === 404) console.warn('Lobby alredy removed');
			else console.warn('Leave failed, error: ', error);
		} finally {
			navigate('/home');
		}
	};

	const handleStartTournament = async () => {
		if (!matchId) return 'Match ID not found!';

		// Toggle current player's ready status
		const currentPlayer = players.find((p) => p.nickname === nickname);
		const newReadyStatus = currentPlayer?.status !== 'READY';

		try {
			await lobbyAPI.updateTournamentReady(matchId, nickname, newReadyStatus);

			// Update local state
			setPlayers((prev) =>
				prev.map((player) =>
					player.nickname === nickname
						? { ...player, status: newReadyStatus ? 'READY' : 'WAITING' }
						: player
				)
			);
		} catch (error) {
			console.error('Error updating ready status:', error);
			return 'Failed to update ready status';
		}

		return null;
	};

	return {
		// State
		nickname,
		matchId,
		players,
		loading,
		isCreator,
		showFriendSelection,
		allFriends,
		selectedFriends,
		acceptedPlayers,
		inviteTimeoutId,
		wsRef,
		size,
		FRIENDS_SIZE,
		MAX_FRIENDS_SIZE,
		readyCount,
		canStartTournament,

		// Setters
		setPlayers,
		setShowFriendSelection,
		setAcceptedPlayers,
		setInviteTimeoutId,

		// Actions
		toggleFriendSelection,
		handleSendInvites,
		handleLeaveTournament,
		handleStartTournament,
	};
}
