import { useState } from 'react';
import { useSocialData } from '../hooks/useSocialData';
import { Notification } from '../components/social/Notification';
import { UserList } from '../components/social/UserList';
import { FriendRequestList } from '../components/social/FriendRequestList';
import { SocialFriendsList } from '../components/social/SocialFriendsList';
import { BlockedUsersList } from '../components/social/BlockedUsersList';
import { GoBackButton } from '../components/chat/GoBackButton';

export function SocialPage() {
	const [nickname] = useState(localStorage.getItem('nickname') || '');
	const [searchQuery, setSearchQuery] = useState('');

	const social = useSocialData(nickname);

	const friendUsernames = social.friends.map((f) => f.username);
	const filteredUsers = social.users.filter(
		(user) =>
			!friendUsernames.includes(user.username) &&
			user.username.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="bg-black min-h-screen text-white font-press-start px-8 py-6">
			{social.notification && <Notification {...social.notification} />}

			<div className="mb-6">
				<GoBackButton />
			</div>

			<div className="flex gap-6">
				<div className="w-1/4">
					<h2 className="text-xl mb-4">Find Users</h2>
					<input
						type="text"
						placeholder="Search users..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="mb-4 px-4 py-2 w-full rounded bg-gray-700 text-white placeholder-gray-400"
					/>
					<UserList users={filteredUsers} onInvite={social.handleInvite} />
				</div>

				<div className="w-1/4">
					<h2 className="text-xl mb-4">Friendship request</h2>
					<FriendRequestList
						requests={social.friendRequest}
						onAccept={social.handleAccept}
						onDecline={social.handleDecline}
					/>
				</div>

				<div className="w-1/4">
					<h2 className="text-xl mb-4">Friends</h2>
					<SocialFriendsList
						friends={social.friends}
						onRemove={social.handleRemoveFriend}
						onBlock={social.handleBlock}
					/>
				</div>

				<div className="w-1/4">
					<h2 className="text-xl mb-4">Blocked Users</h2>
					<BlockedUsersList
						users={social.blockedUsers}
						onUnblock={social.handleUnblock}
					/>
				</div>
			</div>
		</div>
	);
}
