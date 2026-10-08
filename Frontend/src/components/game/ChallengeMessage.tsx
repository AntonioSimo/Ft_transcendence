import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentAPI } from '../../utils/api';

interface ChallengeMessageProps {
	message: any;
	currentUser: string;
	onStatusChange?: (status: string) => void;
}

export function ChallengeMessage({ message, currentUser, onStatusChange }: ChallengeMessageProps) {
	const [status, setStatus] = useState(message.challengeStatus || 'pending');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		setStatus(message.challengeStatus || 'pending');
	}, [message.challengeStatus]);

	const handleAccept = async () => {
		setIsLoading(true);
		setError(null);

		try {
			if (message.matchId) {
				await tournamentAPI.acceptTournamentInvite(message.matchId, currentUser);
				navigate(`/game?matchId=${message.matchId}&mode=direct`);
				setStatus('accepted');
				onStatusChange?.('accepted');
			} else {
				await tournamentAPI.acceptTournamentInvite(message.challengeId, currentUser);
				setStatus('accepted');
				onStatusChange?.('accepted');
				navigate(`/game?matchId=${message.challengeId}&mode=direct`);
			}
		} catch (err: any) {
			const statusCode = err?.response?.status;
			if (statusCode === 404) {
				setError('Invite not found or expired.');
				setStatus('declined');
			} else {
				setError(err?.response?.data?.error || 'Failed to accept invite');
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleDecline = async () => {
		setIsLoading(true);
		setError(null);
		try {
			if (message.matchId) {
				await tournamentAPI.declineTournamentInvite(
					message.matchId,
					currentUser,
					message.from
				);
			} else {
				await tournamentAPI.declineTournamentInvite(
					message.challengeId,
					currentUser,
					message.from
				);
			}
			setStatus('declined');
			onStatusChange?.('declined');
		} catch (error) {
			console.error('Failed to decline challenge:', error);
			setError('Failed to decline challenge');
		} finally {
			setIsLoading(false);
		}
	};

	const isReceiver = message.to === currentUser;
	const isSender = message.from === currentUser;

	return (
		<div className="challenge-message p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg shadow-sm my-2">
			<div className="flex items-center gap-2 mb-2">
				{isSender ? (
					<>
						<span className="text-yellow-800">You challenged</span>
						<span className="font-semibold text-yellow-800">{message.to}</span>
						<span className="text-yellow-600">to a game!</span>
					</>
				) : (
					<>
						<span className="font-semibold text-yellow-800">{message.from}</span>
						<span className="text-yellow-600">challenged you to a game!</span>
					</>
				)}
			</div>

			{error && (
				<div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm">{error}</div>
			)}

			{isReceiver && status === 'pending' && (
				<div className="flex gap-3 mt-3">
					<button
						onClick={handleAccept}
						disabled={isLoading}
						className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors font-bold"
					>
						{isLoading ? 'Processing...' : 'Accept'}
					</button>
					<button
						onClick={handleDecline}
						disabled={isLoading}
						className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-bold"
					>
						{isLoading ? 'Processing...' : 'Decline'}
					</button>
				</div>
			)}

			{status === 'accepted' && (
				<div className="mt-3 p-2 bg-green-100 text-green-800 rounded flex items-center gap-2">
					<span className="font-medium">Challenge accepted! Game starting...</span>
				</div>
			)}

			{status === 'declined' && (
				<div className="mt-3 p-2 bg-red-100 text-red-800 rounded flex items-center gap-2">
					<span className="font-medium">Challenge declined</span>
				</div>
			)}

			{isSender && status === 'pending' && (
				<div className="mt-2 text-sm text-gray-600">
					Waiting for {message.to} to respond...
				</div>
			)}

			<div className="mt-2 text-xs text-gray-500">
				{new Date(message.timestamp).toLocaleTimeString()}
			</div>
		</div>
	);
}
