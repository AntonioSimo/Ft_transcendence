import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentAPI, lobbyAPI } from '../../utils/api';

interface TournamentInviteData {
	from: string;
	matchId: string;
	message: string;
	timestamp: number;
	tournamentSize?: number;
}

export function TournamentInviteListener() {
	const [invite, setInvite] = useState<TournamentInviteData | null>(null);
	const [accepting, setAccepting] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const handleTournamentInvite = (event: Event) => {
			const customEvent = event as CustomEvent;
			setInvite(customEvent.detail);
		};

		window.addEventListener('global:tournament_invite', handleTournamentInvite);

		return () => {
			window.removeEventListener('global:tournament_invite', handleTournamentInvite);
		};
	}, []);

	const handleAccept = async () => {
		if (!invite) return;

		setAccepting(true);

		try {
			const nickname = localStorage.getItem('nickname');

			if (!nickname) {
				setAccepting(false);
				return;
			}
			const aliasData = await lobbyAPI.getTournamentAlias(nickname);
			const tournamentAlias = aliasData?.tournament_alias || nickname;
			`Joining tournament with alias: ${invite.matchId}, ${nickname}, ${tournamentAlias}`;
			if (invite.matchId) {
				await tournamentAPI.acceptTournamentInvite(
					invite.matchId,
					nickname,
					tournamentAlias
				);
			} else {
				await tournamentAPI.acceptTournamentInvite(
					invite.challengeId,
					nickname,
					tournamentAlias
				);
			}
			const tournamentSize = invite.toconsole.logurnamentSize || 4;
			navigate(`/lobby?matchId=${invite.matchId}&tournament=${tournamentSize > 2}`);
			setInvite(null);
		} catch (error: any) {
			setAccepting(false);
		}
	};

	const handleDecline = () => {
		setInvite(null);
	};

	if (!invite) return null;

	const tournamentSize = invite.tournamentSize || 4;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
			<div className="bg-neutral-900 border-2 border-yellow-300 rounded-lg shadow-lg p-8 max-w-md w-full">
				<h2 className="text-2xl font-bold text-yellow-300 mb-4 text-center font-press-start">
					TOURNAMENT INVITE!
				</h2>

				<div className="bg-black border border-yellow-300 rounded p-4 mb-6">
					<p className="text-white text-center mb-2">
						<span className="text-yellow-300 font-bold">{invite.from}</span> invited you
						to a tournament
					</p>
					<p className="text-gray-300 text-sm text-center">{invite.message}</p>
					<p className="text-yellow-400 text-xs text-center mt-2">
						Tournament Size: {tournamentSize} players
					</p>
				</div>

				<div className="flex gap-4">
					<button
						onClick={handleDecline}
						disabled={accepting}
						className={`flex-1 py-3 font-bold rounded-md border-2 shadow-md hover:scale-105 transition font-press-start ${
							accepting
								? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
								: 'bg-red-600 hover:bg-red-700 text-white border-red-400'
						}`}
					>
						DECLINE
					</button>
					<button
						onClick={handleAccept}
						disabled={accepting}
						className={`flex-1 py-3 font-bold rounded-md border-2 shadow-md hover:scale-105 transition font-press-start ${
							accepting
								? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
								: 'bg-green-600 hover:bg-green-700 text-white border-green-400'
						}`}
					>
						{accepting ? 'JOINING...' : 'ACCEPT'}
					</button>
				</div>
			</div>
		</div>
	);
}
