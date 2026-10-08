import type { User } from '../../utils/api/social';
import { IconButton } from './IconButton';

type UserListProps = {
	users: User[];
	onInvite: (username: string) => void;
};

const ADD_ICON =
	'M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z';

export function UserList({ users, onInvite }: UserListProps) {
	return (
		<table className="w-full text-left bg-gray-800 rounded">
			<thead>
				<tr>
					<th className="text-yellow-300 px-4 py-2">Username</th>
				</tr>
			</thead>
			<tbody>
				{users.map((user) => (
					<tr key={user.username} className="hover:bg-gray-700 transition">
						<td className="px-4 py-2 text-white">{user.username || 'Unnamed'}</td>
						<td className="px-4 py-2">
							<IconButton
								onClick={() => onInvite(user.username)}
								title="Invite Friend"
								bgColor="bg-green-600"
								hoverColor="hover:bg-green-700"
								pathD={ADD_ICON}
							/>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
