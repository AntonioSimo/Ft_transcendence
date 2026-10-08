interface Friend {
	username: string;
	status: string;
}

interface FriendsListProps {
	friends: Friend[];
	currentUser: string;
	activeChat: string | null;
	unreadChats: Set<string>;
	onSelectFriend: (username: string) => void;
	onOpenProfile: (username: string) => void;
}

export function FriendsList({
	friends,
	currentUser,
	activeChat,
	unreadChats,
	onSelectFriend,
	onOpenProfile,
}: FriendsListProps) {
	return (
		<div className="mb-4">
			<h3 className="text-lg font-semibold mb-2">Friends</h3>
			<ol className="space-y-2 max-h-40 overflow-y-auto pr-2">
				{friends.map((friend, index) => {
					const friendChatId = [currentUser, friend.username].sort().join('-');
					const hasUnread = unreadChats.has(friendChatId);

					return (
						<li key={index} className="rounded border border-gray-700">
							<div
								className={`w-full text-left p-2 hover:bg-gray-800 rounded flex items-center justify-between ${
									activeChat === friend.username ? 'bg-gray-700' : ''
								}`}
							>
								<button
									onClick={() => onSelectFriend(friend.username)}
									className="flex-1 text-left"
								>
									<div className="flex items-center gap-2">
										<span className="truncate">{friend.username}</span>
										{hasUnread && (
											<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 animate-pulse" />
										)}
									</div>
								</button>

								<div className="flex items-center gap-2">
									<button
										onClick={(e) => {
											e.stopPropagation();
											onOpenProfile(friend.username);
										}}
										className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-600"
										title={`View ${friend.username} profile`}
									>
										👤
									</button>
									<span
										className={`text-xs ${
											friend.status === 'online'
												? 'text-green-400'
												: 'text-gray-400'
										}`}
									>
										{friend.status}
									</span>
								</div>
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
