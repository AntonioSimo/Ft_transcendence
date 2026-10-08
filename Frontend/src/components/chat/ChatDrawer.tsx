import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from './ChatContext';
import { FriendsList } from '../social/FriendsList';
import { ChatMessagesList } from './ChatMessagesList';
import { socialAPI } from '../../utils/api';

import { AlertMessage } from '../profile/AlertMessage';

interface Friend {
	username: string;
	status: string;
}

export function ChatDrawer() {
	const navigate = useNavigate();
	const {
		isChatOpen,
		activeChat,
		showChat,
		sendMessage,
		messages,
		toggleChat,
		unreadChats,
		markChatAsRead,
		updateChallengeStatus,
		updateInviteStatus,
		error,
		clearError,
	} = useChat();

	const [messageInput, setMessageInput] = useState('');
	const [friends, setFriends] = useState<Friend[]>([]);
	const currentUser = localStorage.getItem('nickname') || '';

	const chatId = activeChat ? [currentUser, activeChat].sort().join('-') : '';
	const chatMessages = chatId ? messages[chatId] || [] : [];

	const fetchFriends = async () => {
		if (!currentUser) return;

		try {
			const friendsData = await socialAPI.getFriends(currentUser);
			setFriends(friendsData);
		} catch (error) {
			console.error('Failed to load friends:', error);
		}
	};

	useEffect(() => {
		if (isChatOpen) {
			fetchFriends();
			const interval = setInterval(fetchFriends, 5000);
			return () => clearInterval(interval);
		}
	}, [isChatOpen, currentUser]);

	useEffect(() => {
		const handleBeforeUnload = async () => {
			if (currentUser) {
				await socialAPI.logoutStatus(currentUser);
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [currentUser]);

	useEffect(() => {
		if (activeChat && isChatOpen) {
			const chatId = [currentUser, activeChat].sort().join('-');
			markChatAsRead(chatId);
		}
	}, [activeChat, isChatOpen, currentUser, markChatAsRead]);

	const handleSendMessage = () => {
		if (messageInput.trim() && activeChat) {
			sendMessage(messageInput.trim(), activeChat);
			setMessageInput('');
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			handleSendMessage();
		}
	};

	const handleShowChat = (friendUsername: string) => {
		showChat(friendUsername);
		const chatId = [currentUser, friendUsername].sort().join('-');
		markChatAsRead(chatId);
	};

	const openProfile = (username: string) => {
		if (!username) return;
		navigate(`/profile/${encodeURIComponent(username)}`);
	};

	if (!isChatOpen) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-black bg-opacity-30 z-[1199]"
				onClick={() => toggleChat && toggleChat()}
			/>

			<div
				className="fixed top-3 right-3 w-1/3 h-[94%] bg-gray-900 text-white shadow-lg rounded-lg z-[1200] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-4 flex flex-col h-full">
					{error && <AlertMessage type="error" message={error} onClose={clearError} />}

					<h2 className="text-xl font-bold mb-4">
						Chat {activeChat && `- ${activeChat}`}
					</h2>

					<FriendsList
						friends={friends}
						currentUser={currentUser}
						activeChat={activeChat}
						unreadChats={unreadChats}
						onSelectFriend={handleShowChat}
						onOpenProfile={openProfile}
					/>

					<ChatMessagesList
						activeChat={activeChat}
						chatMessages={chatMessages}
						currentUser={currentUser}
						onOpenProfile={openProfile}
						onUpdateChallengeStatus={(messageId, status) => {
							if (!chatId) return;
							updateChallengeStatus(chatId, messageId, status);
						}}
						onUpdateInviteStatus={(messageId, status) => {
							if (!chatId) return;
							updateInviteStatus(chatId, messageId, status);
						}}
					/>

					<div className="flex items-center gap-2">
						<input
							type="text"
							value={messageInput}
							onChange={(e) => setMessageInput(e.target.value)}
							onKeyDown={handleKeyPress}
							placeholder={
								activeChat ? `Message ${activeChat}...` : 'Select a friend to chat'
							}
							disabled={!activeChat}
							className="flex-1 p-2 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-300"
						/>
						<button
							onClick={handleSendMessage}
							disabled={!activeChat || !messageInput.trim()}
							className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-300 text-black text-lg font-bold hover:bg-yellow-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
							title="Send message"
						>
							&gt;
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
