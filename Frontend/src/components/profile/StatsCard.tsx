import { ChartStats } from '../game/ChartStats';
import type { ProfileData } from '../../utils/api/profile';

interface StatsCardProps {
	profileData: ProfileData | null;
}

export function StatsCard({ profileData }: StatsCardProps) {
	const played = profileData?.played || 0;
	const wins = profileData?.wins || 0;
	const losses = played - wins;
	const winRate = played ? ((wins / played) * 100).toFixed(2) : '0';

	return (
		<div className="bg-gray-900 border border-gray-700 rounded-lg p-4 sm:p-6 hover:border-yellow-300 transition-colors">
			<h3 className="text-lg sm:text-xl text-yellow-300 mb-4 flex items-center">
				Game Statistics
			</h3>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="space-y-3 text-xs sm:text-sm">
					<div className="flex justify-between items-center">
						<span className="text-gray-400">Games Played:</span>
						<span className="text-white font-bold text-base">{played}</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-gray-400">Wins:</span>
						<span className="text-green-400 font-bold text-base">{wins}</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-gray-400">Losses:</span>
						<span className="text-red-400 font-bold text-base">{losses}</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-gray-400">Win Rate:</span>
						<span className="text-yellow-300 font-bold text-base">{winRate}%</span>
					</div>
				</div>

				<div>
					<ChartStats profileData={profileData} />
				</div>
			</div>
		</div>
	);
}
