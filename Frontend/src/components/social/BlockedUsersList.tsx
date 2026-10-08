import type { User } from '../../utils/api/social';
import { IconButton } from './IconButton';

type BlockedUsersListProps = {
	users: User[];
	onUnblock: (username: string) => void;
};

const X_ICON =
	'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z';

export function BlockedUsersList({ users, onUnblock }: BlockedUsersListProps) {
	return (
		<table className="w-full text-left bg-gray-800 rounded">
			<thead>
				<tr>
					<th className="text-yellow-300 px-4 py-2">User</th>
					<th className="text-yellow-300 px-4 py-2">Actions</th>
				</tr>
			</thead>
			<tbody>
				{users.map((user) => (
					<tr key={user.username} className="hover:bg-gray-700 transition">
						<td className="px-4 py-2 text-white">{user.username}</td>
						<td className="px-4 py-2">
							<IconButton
								onClick={() => onUnblock(user.username)}
								title="Unblock"
								bgColor="bg-blue-600"
								hoverColor="hover:bg-blue-700"
								pathD={X_ICON}
							/>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
