interface LobbyActionsProps {
	canStartTournament: boolean;
	readyCount: number;
	size: number;
	onLeave: () => void;
	onInviteFriends: () => void;
	onStart: () => void;
	currentPlayerStatus?: 'READY' | 'WAITING';
}

export function LobbyActions({ onLeave, onInviteFriends }: LobbyActionsProps) {
	const buttonClass = 'flex-1 py-3 rounded-md border-2 shadow-md hover:scale-105 transition';

	return (
		<div className="flex justify-between mt-8 space-x-4">
			<button
				onClick={onLeave}
				className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white border-red-400`}
			>
				LEAVE
			</button>

			<button
				onClick={onInviteFriends}
				className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white border-blue-400`}
			>
				INVITE FRIENDS
			</button>
		</div>
	);
}
