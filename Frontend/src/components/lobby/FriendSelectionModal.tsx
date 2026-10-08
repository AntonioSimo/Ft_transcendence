interface Player {
	nickname: string;
	status: 'READY' | 'WAITING';
	isOnline: boolean;
	tournament_alias?: string;
}

interface FriendSelectionModalProps {
	show: boolean;
	friends: Player[];
	selectedFriends: Set<string>;
	friendsSize: number;
	onToggle: (nickname: string) => void;
	onClose: () => void;
	onSend: () => void;
}

export function FriendSelectionModal({
	show,
	friends,
	selectedFriends,
	friendsSize,
	onToggle,
	onClose,
	onSend,
}: FriendSelectionModalProps) {
	if (!show) return null;

	const buttonClass = 'flex-1 py-3 rounded-md border-2 shadow-md hover:scale-105 transition';

	return (
		<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
			<div className="bg-neutral-900 border-2 border-yellow-300 rounded-lg shadow-lg p-6 w-full max-w-lg">
				<h2 className="text-xl text-yellow-300 mb-4 text-center">INVITE FRIENDS</h2>
				<p className="text-sm text-gray-300 mb-2">
					Select {friendsSize} {friendsSize === 1 ? 'friend' : 'friends'}
				</p>
				<div className="max-h-96 overflow-y-auto mb-4">
					{friends.map((friend) => (
						<div
							key={friend.nickname}
							onClick={() => onToggle(friend.nickname)}
							className={`p-3 mb-2 rounded cursor-pointer border-2 transition ${
								selectedFriends.has(friend.nickname)
									? 'bg-green-700 border-green-400'
									: 'bg-gray-800 border-gray-600 hover:border-yellow-300'
							}`}
						>
							<div className="flex justify-between items-center">
								<span>{friend.tournament_alias || friend.nickname}</span>
								<span
									className={friend.isOnline ? 'text-green-400' : 'text-gray-500'}
								>
									{friend.isOnline ? '● Online' : '○ Offline'}
								</span>
							</div>
						</div>
					))}
				</div>
				<div className="flex gap-4">
					<button
						onClick={onClose}
						className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white border-red-400`}
					>
						LEAVE
					</button>
					<button
						onClick={onSend}
						disabled={selectedFriends.size !== friendsSize}
						className={`${buttonClass} ${
							selectedFriends.size === friendsSize
								? 'bg-green-600 hover:bg-green-700 border-green-400 text-white'
								: 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
						}`}
					>
						SEND ({selectedFriends.size})
					</button>
				</div>
			</div>
		</div>
	);
}
