import type { User } from '../../utils/api/social';
import { IconButton } from './IconButton';

type SocialFriendsListProps = {
	friends: User[];
	onRemove: (username: string) => void;
	onBlock: (username: string) => void;
};

const X_ICON =
	'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z';
const BLOCK_ICON =
	'M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z';

export function SocialFriendsList({ friends, onRemove, onBlock }: SocialFriendsListProps) {
	return (
		<table className="w-full text-left bg-gray-800 rounded">
			<thead>
				<tr>
					<th className="text-yellow-300 px-4 py-2">User</th>
				</tr>
			</thead>
			<tbody>
				{friends.map((friend) => (
					<tr key={friend.username} className="hover:bg-gray-700 transition">
						<td className="px-4 py-2 text-white flex items-center gap-2">
							<div
								className={`w-2 h-2 rounded-full ${
									friend.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
								}`}
							></div>
							{friend.username}
						</td>
						<td className="px-4 py-2">
							<div className="flex gap-2">
								<IconButton
									onClick={() => onRemove(friend.username)}
									title="Remove Friend"
									bgColor="bg-red-600"
									hoverColor="hover:bg-red-700"
									pathD={X_ICON}
								/>
								<IconButton
									onClick={() => onBlock(friend.username)}
									title="Block Friend"
									bgColor="bg-yellow-600"
									hoverColor="hover:bg-yellow-700"
									pathD={BLOCK_ICON}
								/>
							</div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
