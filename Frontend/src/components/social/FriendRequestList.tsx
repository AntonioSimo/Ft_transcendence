import type { FriendRequest } from '../../utils/api/social';
import { IconButton } from './IconButton';

type FriendRequestListProps = {
	requests: FriendRequest[];
	onAccept: (sender: string) => void;
	onDecline: (sender: string) => void;
};

const CHECK_ICON =
	'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z';
const X_ICON =
	'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z';

export function FriendRequestList({ requests, onAccept, onDecline }: FriendRequestListProps) {
	return (
		<table className="w-full text-left bg-gray-800 rounded">
			<thead>
				<tr>
					<th className="text-yellow-300 px-4 py-2">From</th>
				</tr>
			</thead>
			<tbody>
				{requests.map((request) => (
					<tr key={request.sender} className="hover:bg-gray-700 transition">
						<td className="px-4 py-2 text-white">{request.sender}</td>
						<td className="px-4 py-2">
							<div className="flex gap-2">
								<IconButton
									onClick={() => onAccept(request.sender)}
									title="Accept"
									bgColor="bg-green-600"
									hoverColor="hover:bg-green-700"
									pathD={CHECK_ICON}
								/>
								<IconButton
									onClick={() => onDecline(request.sender)}
									title="Decline"
									bgColor="bg-red-600"
									hoverColor="hover:bg-red-700"
									pathD={X_ICON}
								/>
							</div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
