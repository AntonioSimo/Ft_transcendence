interface Player {
	nickname: string;
	status: 'READY' | 'WAITING';
	isOnline: boolean;
	tournament_alias?: string;
}

interface PlayerTableProps {
	players: Player[];
}

export function PlayerTable({ players }: PlayerTableProps) {
	return (
		<table className="w-full text-center border-collapse">
			<thead>
				<tr className="text-yellow-300 border-b border-yellow-300">
					<th className="py-2">PLAYER</th>
					<th className="py-2">STATUS</th>
					<th className="py-2">ONLINE</th>
				</tr>
			</thead>
			<tbody>
				{players.map((player, index) => (
					<tr
						key={`${player.tournament_alias || player.nickname}-${index}`}
						className="border-b border-gray-700 hover:bg-gray-800 transition"
					>
						<td className="py-3">{player.tournament_alias || player.nickname}</td>
						<td
							className={`py-3 ${player.status === 'READY' ? 'text-green-400' : 'text-red-400'}`}
						>
							{player.status}
						</td>
						<td
							className={`py-3 ${player.isOnline ? 'text-green-400' : 'text-gray-500'}`}
						>
							{player.isOnline ? '●' : '○'}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
