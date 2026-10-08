import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseTournamentEventsProps {
	matchId: string | null;
	isCreator: boolean;
	FRIENDS_SIZE: number;
	inviteTimeoutId: NodeJS.Timeout | null;
	setPlayers: React.Dispatch<React.SetStateAction<any[]>>;
	setAcceptedPlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
	setInviteTimeoutId: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>;
	onError: (error: string) => void;
}

export function useTournamentEvents({
	matchId,
	isCreator,
	FRIENDS_SIZE,
	inviteTimeoutId,
	setPlayers,
	setAcceptedPlayers,
	setInviteTimeoutId,
	onError,
}: UseTournamentEventsProps) {
	const navigate = useNavigate();
	const handledRef = useRef(false);

	useEffect(() => {
		const handlePlayerJoined = (event: Event) => {
			const {
				matchId: eventMatchId,
				playerNickname,
				playerTournamentAlias,
			} = (event as CustomEvent).detail;

			if (eventMatchId === matchId) {
				if (isCreator) {
					setAcceptedPlayers((prev) => {
						const newAccepted = new Set(prev);
						newAccepted.add(playerNickname);

						if (newAccepted.size === FRIENDS_SIZE && inviteTimeoutId) {
							clearTimeout(inviteTimeoutId);
							setInviteTimeoutId(null);
						}
						return newAccepted;
					});
				}

				setPlayers((prev) => {
					const exists = prev.find((p) => p.nickname === playerNickname);

					if (exists) {
						return prev.map((p) =>
							p.nickname === playerNickname
								? {
										...p,
										tournament_alias:
											playerTournamentAlias ||
											p.tournament_alias ||
											p.nickname,
										status: 'READY',
										isOnline: true,
									}
								: p
						);
					}
					return [
						...prev,
						{
							nickname: playerNickname,
							tournament_alias: playerTournamentAlias || playerNickname,
							status: 'READY',
							isOnline: true,
						},
					];
				});
			}
		};

		const handleReadyUpdate = (event: Event) => {
			const {
				matchId: eventMatchId,
				playerNickname,
				isReady,
			} = (event as CustomEvent).detail;

			if (eventMatchId === matchId) {
				setPlayers((prev) =>
					prev.map((player) =>
						player.nickname === playerNickname
							? { ...player, status: isReady ? 'READY' : 'WAITING' }
							: player
					)
				);
			}
		};

		const handleInviteDeclined = (event: Event) => {
			const { matchId: eventMatchId, playerNickname } = (event as CustomEvent).detail || {};
			if (handledRef.current) return;
			if (matchId && eventMatchId && eventMatchId !== matchId) return;
			handledRef.current = true;
			if (inviteTimeoutId) {
				clearTimeout(inviteTimeoutId);
				setInviteTimeoutId(null);
			}
			const msg = `Tournament cancelled: ${playerNickname || 'a player'} declined the invite.`;
			try {
				localStorage.setItem('global_cancel_alert', msg);
			} catch {}
			onError(msg);
			navigate('/home');
		};

		const handleMatchCancelled = (event: Event) => {
			const { matchId: eventMatchId, playerNickname } = (event as CustomEvent).detail || {};
			if (handledRef.current) return;
			if (matchId && eventMatchId && eventMatchId !== matchId) return;
			handledRef.current = true;
			if (inviteTimeoutId) {
				clearTimeout(inviteTimeoutId);
				setInviteTimeoutId(null);
			}
			const msg = `Tournament cancelled${playerNickname ? `: ${playerNickname} left` : ''}.`;
			try {
				localStorage.setItem('global_cancel_alert', msg);
			} catch {}
			onError(msg);
			navigate('/home');
		};

		const handleTournamentCancelled = (event: Event) => {
			const { message, playerNickname } = (event as CustomEvent).detail;
			onError(message || `Tournament cancelled: ${playerNickname} left the lobby.`);
			navigate('/home');
		};

		window.addEventListener('global:tournament_player_joined', handlePlayerJoined);
		window.addEventListener('global:tournament_ready_update', handleReadyUpdate);
		window.addEventListener(
			'global:tournament_invite_declined',
			handleInviteDeclined as EventListener
		);
		window.addEventListener('global:match_cancelled', handleMatchCancelled as EventListener);
		window.addEventListener(
			'global:tournament_cancelled',
			handleTournamentCancelled as EventListener
		);

		return () => {
			window.removeEventListener('global:tournament_player_joined', handlePlayerJoined);
			window.removeEventListener('global:tournament_ready_update', handleReadyUpdate);
			window.removeEventListener(
				'global:tournament_invite_declined',
				handleInviteDeclined as EventListener
			);
			window.removeEventListener(
				'global:match_cancelled',
				handleMatchCancelled as EventListener
			);
			window.removeEventListener(
				'global:tournament_cancelled',
				handleTournamentCancelled as EventListener
			);
			if (inviteTimeoutId) clearTimeout(inviteTimeoutId);
		};
	}, [
		matchId,
		isCreator,
		inviteTimeoutId,
		FRIENDS_SIZE,
		navigate,
		setPlayers,
		setAcceptedPlayers,
		setInviteTimeoutId,
		onError,
	]);
}
