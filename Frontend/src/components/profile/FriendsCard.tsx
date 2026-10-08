import type { ProfileData } from '../../utils/api/profile';

interface FriendsCardProps {
	profileData: ProfileData | null;
}

export function FriendsCard({ profileData }: FriendsCardProps) {
	return (
		<div className="bg-gray-900 border border-gray-700 rounded-lg p-4 sm:p-6 hover:border-yellow-300 transition-colors">
			<h3 className="text-lg sm:text-xl text-yellow-300 mb-4 flex items-center">Friends</h3>
			<div className="space-y-3 text-xs sm:text-sm">
				<div className="flex justify-between items-center">
					<span className="text-gray-400">Total Friends:</span>
					<span className="text-white font-bold text-base">
						{profileData?.friendsNumber || 0}
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-gray-400">Online Now:</span>
					<span className="text-green-400 font-bold text-base">
						{profileData?.friendsOnline || 0}
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-gray-400">Pending Requests:</span>
					<span className="text-yellow-300 font-bold text-base">
						{profileData?.pendingRequests || 0}
					</span>
				</div>
			</div>
		</div>
	);
}
