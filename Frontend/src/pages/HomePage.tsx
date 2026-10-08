import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertMessage } from '../components/profile/AlertMessage';
import { ChatProvider, useChat } from '../components/chat/ChatContext';
import { authAPI } from '../utils/api';
import { socialAPI } from '../utils/api';
import { chatAPI } from '../utils/api';
import logo from '../../public/logo.jpg';

type HomePageProps = {
	push?: boolean;
};

export function HomePage({ push = true }: HomePageProps) {
	const [dropdownVisible, setDropdownVisible] = useState(false);
	const [showDifficulty, setShowDifficulty] = useState(false);
	const [showTournamentModes, setShowTournamentModes] = useState(false);
	const [globalAlert, setGlobalAlert] = useState<string | null>(null);
	const [hasUnreadMessages, setHasUnreadMessages] = useState(false); //test
	const menuBtnRef = useRef<HTMLButtonElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const hasFetchedFriends = useRef(false);
	const { disconnectChat, showNotification } = useChat();
	const { markChatAsUnread } = useChat();
	const navigate = useNavigate();

	useEffect(() => {
		if (push) navigate('/home', { replace: true });
	}, [navigate, push]);

	useEffect(() => {
		try {
			const msg = localStorage.getItem('global_cancel_alert');
			if (msg) {
				setGlobalAlert(msg);
				localStorage.removeItem('global_cancel_alert');
			}
		} catch {}
	}, []);

	useEffect(() => {
		if (!globalAlert) return;
		const timer = setTimeout(() => setGlobalAlert(null), 5000);
		return () => clearTimeout(timer);
	}, [globalAlert]);

	useEffect(() => {
		if (hasFetchedFriends.current) return;
		hasFetchedFriends.current = true;
		const nickname = localStorage.getItem('nickname');
		if (!nickname) {
			navigate('/auth');
			return;
		}

		async function fetchFriendsAndLoadChat() {
			try {
				const nickname = localStorage.getItem('nickname');
				if (!nickname) {
					navigate('/auth');
					return;
				}
				if (localStorage.getItem('checkedMessages') === 'true') {
					return;
				}

				const friends = await socialAPI.getFriends(nickname);
				const friendsList = friends.map((friend) => friend.username);

				for (const friend of friendsList) {
					const messages = await chatAPI.loadChatHistory(nickname, friend);
					const isUnread = await chatAPI.checkIfMessageIsRead(
						nickname,
						friend,
						messages[messages.length - 1]?.id || ''
					);
					if (isUnread) {
						markChatAsUnread(friend);
					}
					localStorage.setItem('checkedMessages', 'true');
					return;
				}
				localStorage.setItem('checkedMessages', 'true');
			} catch (error) {
				console.error('Error fetching friends:', error);
			}
		}

		fetchFriendsAndLoadChat();
	}, [navigate]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				menuBtnRef.current &&
				dropdownRef.current &&
				!menuBtnRef.current.contains(event.target as Node) &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setDropdownVisible(false);
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, []);

	const handleLogout = async () => {
		const nickname = localStorage.getItem('nickname');
		if (!nickname) {
			navigate('/auth');
			return;
		}

		disconnectChat();

		try {
			await authAPI.logout(nickname);
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			localStorage.removeItem('nickname');
			localStorage.removeItem('is2FAVerified');
			navigate('/auth');
		}
	};

	const handleNavigate = (path: string) => {
		setDropdownVisible(false);
		if (path === '/logout') handleLogout();
		else navigate(path);
	};

	const toggleModal = (modal: 'difficulty' | 'tournament') => {
		setShowDifficulty(modal === 'difficulty');
		setShowTournamentModes(modal === 'tournament');
	};

	const closeModals = () => {
		setShowDifficulty(false);
		setShowTournamentModes(false);
	};

	const menuButtonClass =
		'block w-full px-6 py-4 rounded-lg bg-black hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105';
	const gameButtonClass =
		'px-6 py-4 rounded-lg bg-black text-white hover:bg-yellow-300 hover:text-black transition-transform duration-300 ease-in-out hover:scale-110 group-hover:scale-90 group-hover:hover:scale-110';
	const modalButtonClass =
		'px-6 py-3 rounded-lg bg-black text-white hover:bg-yellow-400 transition';

	return (
		<div className="relative min-h-screen bg-black text-white font-press-start">
			{globalAlert && (
				<div className="fixed top-4 left-4 right-4 z-50">
					<AlertMessage
						type="error"
						message={globalAlert}
						onClose={() => setGlobalAlert(null)}
					/>
				</div>
			)}
			<div className="absolute top-4 right-4 z-20">
				<div className="relative">
					<button
						ref={menuBtnRef}
						onClick={() => setDropdownVisible(!dropdownVisible)}
						className="bg-white text-black w-24 h-24 rounded-full flex items-center justify-center hover:bg-gray-300 transition"
					>
						<img
							src={logo}
							alt="Logo"
							className="w-full h-full rounded-full object-cover border-4 border-yellow-300"
						/>
					</button>

					{dropdownVisible && (
						<div
							ref={dropdownRef}
							className="absolute right-0 mt-2 w-48 bg-black text-white rounded-lg shadow-md z-30 space-y-2 p-2"
						>
							<button
								onClick={() => handleNavigate('/profile')}
								className={menuButtonClass}
							>
								PROFILE
							</button>
							<button
								onClick={() => handleNavigate('/social')}
								className={menuButtonClass}
							>
								SOCIAL
							</button>
							<button
								onClick={() => handleNavigate('/logout')}
								className={menuButtonClass}
							>
								LOGOUT
							</button>
						</div>
					)}
				</div>
			</div>

			<div
				className={`flex flex-col items-center justify-center min-h-screen space-y-12 transition ${
					showDifficulty || showTournamentModes ? 'blur-sm pointer-events-none' : ''
				}`}
			>
				<h1 className="text-6xl font-bold text-center pointer-events-auto">
					TRANSCENDENCE
				</h1>

				<div className="flex flex-col space-y-6 pointer-events-auto group">
					<button
						onClick={() => navigate('/lobby?online')}
						className={`${gameButtonClass} text-lg`}
					>
						ONLINE
					</button>

					<button
						onClick={() => toggleModal('tournament')}
						className={`${gameButtonClass} text-base`}
					>
						TOURNAMENT
					</button>
				</div>
			</div>

			{(showDifficulty || showTournamentModes) && (
				<div
					className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
					onClick={closeModals}
				>
					{showDifficulty && (
						<div
							className="flex flex-col items-center space-y-4 bg-yellow-300 text-black p-8 rounded-lg shadow-lg"
							onClick={(e) => e.stopPropagation()}
						>
							<p className="text-lg mb-2">Select Difficulty:</p>
							{['EASY', 'HARD'].map((difficulty) => (
								<button
									key={difficulty}
									onClick={() =>
										navigate(`/singleplayer/${difficulty.toLowerCase()}`)
									}
									className={modalButtonClass}
								>
									{difficulty}
								</button>
							))}
						</div>
					)}

					{showTournamentModes && (
						<div
							className="flex flex-col items-center space-y-4 bg-yellow-300 text-black p-8 rounded-lg shadow-lg"
							onClick={(e) => e.stopPropagation()}
						>
							{/* <p className="text-lg mb-2">Tournament</p> */}
							<button
								onClick={() => navigate('/lobby?tournament')}
								className={modalButtonClass}
							>
								4 PLAYERS
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
