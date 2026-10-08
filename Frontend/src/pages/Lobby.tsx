import { useState } from 'react';
import { useLobbyState } from '../hooks/useLobbyState';
import { useTournamentEvents } from '../hooks/useTournamentEvents';
import { FriendSelectionModal } from '../components/lobby/FriendSelectionModal';
import { PlayerTable } from '../components/lobby/PlayerTable';
import { LobbyActions } from '../components/lobby/LobbyActions';
import { GoBackButton } from '../components/chat/GoBackButton';

export default function LobbyPage() {
	const [error, setError] = useState<string | null>(null);
	const lobby = useLobbyState();

	useTournamentEvents({
		matchId: lobby.matchId,
		isCreator: lobby.isCreator,
		FRIENDS_SIZE: lobby.FRIENDS_SIZE,
		inviteTimeoutId: lobby.inviteTimeoutId,
		setPlayers: lobby.setPlayers,
		setAcceptedPlayers: lobby.setAcceptedPlayers,
		setInviteTimeoutId: lobby.setInviteTimeoutId,
		onError: setError,
	});

	const handleSendInvites = async () => {
		const result = await lobby.handleSendInvites();
		if (result) setError(result);
	};

	const handleStartTournament = async () => {
		const result = await lobby.handleStartTournament();
		if (result) setError(result);
	};

	const handleToggleFriend = (nickname: string) => {
		lobby.toggleFriendSelection(nickname);
		if (
			lobby.selectedFriends.size >= lobby.FRIENDS_SIZE &&
			!lobby.selectedFriends.has(nickname)
		) {
			setError(
				`Select ${lobby.FRIENDS_SIZE} ${lobby.FRIENDS_SIZE === 1 ? 'friend' : 'friends'} only!`
			);
		}
	};

	const currentPlayer = lobby.players.find((p) => p.nickname === lobby.nickname);

	if (lobby.loading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<p className="text-yellow-300 text-xl">LOADING TOURNAMENT...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white font-press-start">
			<div className="absolute top-6 left-8">
				<GoBackButton />
			</div>

			<div className="min-h-screen flex flex-col items-center justify-center">
				<h1 className="text-2xl text-yellow-300 mb-6">LOBBY</h1>

				{error && (
					<div className="fixed top-4 right-4 bg-red-600 border-2 border-red-400 text-white px-4 py-2 rounded shadow-lg z-50">
						{error}
						<button onClick={() => setError(null)} className="ml-4 font-bold">
							✕
						</button>
					</div>
				)}

				<FriendSelectionModal
					show={lobby.showFriendSelection}
					friends={lobby.allFriends}
					selectedFriends={lobby.selectedFriends}
					friendsSize={lobby.FRIENDS_SIZE}
					onToggle={handleToggleFriend}
					onClose={() => lobby.setShowFriendSelection(false)}
					onSend={handleSendInvites}
				/>

				<div className="bg-neutral-900 border-2 border-yellow-300 rounded-lg shadow-lg p-6 w-full max-w-md">
					<PlayerTable players={lobby.players} />

					<LobbyActions
						canStartTournament={lobby.canStartTournament}
						readyCount={lobby.readyCount}
						size={lobby.size}
						onLeave={lobby.handleLeaveTournament}
						onInviteFriends={() => lobby.setShowFriendSelection(true)}
						onStart={handleStartTournament}
						currentPlayerStatus={currentPlayer?.status}
					/>
				</div>

				<p className="text-gray-500 text-xs mt-8 tracking-widest">
					{lobby.canStartTournament ? 'ALL PLAYERS READY!' : 'WAITING FOR PLAYERS...'}
				</p>
			</div>
		</div>
	);
}
