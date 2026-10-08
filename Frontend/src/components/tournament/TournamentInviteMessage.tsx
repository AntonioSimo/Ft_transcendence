import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentAPI } from '../../utils/api';

interface TournamentInviteMessageProps {
	message: any;
	currentUser: string;
	onStatusChange?: (status: string) => void;
}

export function TournamentInviteMessage({
	message,
	currentUser,
	onStatusChange,
}: TournamentInviteMessageProps) {
	const [status, setStatus] = useState(message.inviteStatus || 'pending');
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	TournamentInviteMessage;
	const tournamentSize = message.tournamentSize || 4;
	const isReceiver = message.to === currentUser;
	const isSender = message.from === currentUser;

	useEffect(() => {
		setStatus(message.inviteStatus || 'pending');
	}, [message.inviteStatus]);

	const handleAccept = async () => {
		if (status !== 'pending') return;
		setIsLoading(true);
		try {
			if (message.matchId) {
				await tournamentAPI.acceptTournamentInvite(message.matchId, currentUser);
				navigate(`/lobby?matchId=${message.matchId}&tournament=${tournamentSize > 2}`);
				setStatus('accepted');
				onStatusChange?.('accepted');
			} else {
				await tournamentAPI.acceptTournamentInvite(message.challengeId, currentUser);
				setStatus('accepted');
				onStatusChange?.('accepted');
				navigate(`/lobby?matchId=${message.challengeId}&tournament=${tournamentSize > 2}`);
			}
		} catch (error: any) {
			console.error('Failed to accept tournament invite:', error);
			setIsLoading(false);
		}
	};

	const handleDecline = async () => {
		if (status !== 'pending') return;
		setIsLoading(true);
		try {
			if (message.matchId) {
				await tournamentAPI.declineTournamentInvite(
					message.matchId,
					currentUser,
					message.from
				);
				setStatus('declined');
				onStatusChange?.('declined');
			} else {
				await tournamentAPI.declineTournamentInvite(
					message.challengeId,
					currentUser,
					message.from
				);
				setStatus('declined');
				onStatusChange?.('declined');
			}
		} catch (error) {
			alert('Failed to decline tournament invite');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="tournament-invite p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 rounded-lg shadow-sm my-2">
			<div className="flex items-center gap-2 mb-2">
				{isSender ? (
					<>
						<span className="text-purple-800">You invited</span>
						<span className="font-semibold text-purple-800">{message.to}</span>
						<span className="text-purple-800">to a tournament!</span>
					</>
				) : (
					<>
						<span className="font-semibold text-purple-800">{message.from}</span>
						<span className="text-purple-800">invited you to a tournament!</span>
					</>
				)}
			</div>

			{isReceiver && status === 'pending' && (
				<div className="flex gap-3 mt-3">
					<button
						onClick={handleAccept}
						disabled={isLoading || status !== 'pending'}
						className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors font-bold"
					>
						{isLoading ? 'Joining...' : 'Join Tournament'}
					</button>
					<button
						onClick={handleDecline}
						disabled={isLoading || status !== 'pending'}
						className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors font-bold"
					>
						Decline
					</button>
				</div>
			)}

			{status === 'declined' && (
				<div className="mt-3 p-2 bg-gray-100 text-gray-800 rounded">
					<span className="font-medium">Invite declined</span>
				</div>
			)}

			{status === 'cancelled' && (
				<div className="mt-3 p-2 bg-red-100 text-red-800 rounded">
					<span className="font-medium">Tournament cancelled</span>
				</div>
			)}

			{isSender && status === 'pending' && (
				<div className="mt-2 text-sm text-gray-600">
					Waiting for {message.to} to respond...
				</div>
			)}
		</div>
	);
}
