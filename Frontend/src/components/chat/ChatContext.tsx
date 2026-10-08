import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { createWebSocketUrl } from '../../config/api';
import { checkIfUserBlocked } from '../../utils/api/blockedUsers';
import { chatAPI } from '../../utils/api';

type Message = {
	id: string;
	from: string;
	to: string;
	message: string;
	timestamp: number;
	type?: string;
	challengeId?: string;
	challengeStatus?: string;
	inviteStatus?: string;
	groupId?: string;
	matchId?: string;
	messageType?: string;
	challenger?: string;
	opponent?: string;
};

interface ChatContextType {
	isChatOpen: boolean;
	toggleChat: () => void;
	activeChat: string | null;
	showChat: (friendUsername: string) => void;
	sendMessage: (message: string, to: string) => void;
	sendChallengeMessage: (to: string) => void;
	messages: Record<string, Message[]>;
	isConnected: boolean;
	loadChatHistory: (friendUsername: string) => Promise<void>;
	disconnectChat: () => void;
	notification: boolean;
	unreadChats: Set<string>;
	markChatAsRead: (chatId: string) => void;
	updateChallengeStatus: (chatId: string, messageId: string, status: string) => void;
	updateInviteStatus: (chatId: string, messageId: string, status: string) => void;
	error: string | null;
	clearError: () => void;
	markChatAsUnread: (friendUsername: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [activeChat, setActiveChat] = useState<string | null>(null);
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [messages, setMessages] = useState<Record<string, Message[]>>({});
	const [isReconnecting, setIsReconnecting] = useState(false);
	const [shouldReconnect, setShouldReconnect] = useState(true);
	const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);

	const currentUser = localStorage.getItem('nickname') || 'anonymous';

	const isChatOpenRef = useRef(isChatOpen);
	const activeChatRef = useRef(activeChat);

	useEffect(() => {
		isChatOpenRef.current = isChatOpen;
		activeChatRef.current = activeChat;
	}, [isChatOpen, activeChat]);

	const loadChatHistory = useCallback(
		async (friendUsername: string) => {
			try {
				const messages = await chatAPI.loadChatHistory(currentUser, friendUsername);

				const chatId = [currentUser, friendUsername].sort().join('-');
				const formattedMessages = messages.map((msg: any) => ({
					id: msg.id,
					from: msg.sender_Nickname,
					to: friendUsername === msg.sender_Nickname ? currentUser : friendUsername,
					message: msg.message,
					timestamp: new Date(msg.created_at).getTime(),
					type: msg.type || 'chat_message',
					challengeId: msg.challengeId,
					challengeStatus: msg.challengeStatus,
					inviteStatus: msg.inviteStatus,
				}));

				setMessages((prev) => ({ ...prev, [chatId]: formattedMessages }));
			} catch (error) {
				console.error('Failed to load chat history:', error);
			}
		},
		[currentUser]
	);

	const connectToChat = useCallback(
		(friendUsername: string) => {
			if (socket?.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({
						type: 'join_chat',
						currentUser,
						participants: [currentUser, friendUsername],
					})
				);
				return;
			}

			if (socket?.readyState !== WebSocket.CONNECTING) {
				socket?.close();
			}
			const ws = new WebSocket(createWebSocketUrl('/chat'));
			let pingInterval: NodeJS.Timeout;

			ws.onopen = () => {
				setIsConnected(true);
				ws.send(
					JSON.stringify({
						type: 'join_chat',
						currentUser,
						participants: [currentUser, friendUsername],
					})
				);

				pingInterval = setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: 'ping' }));
					}
				}, 5000);
			};

			ws.onmessage = (event) => {
				const data = JSON.parse(event.data);

				if (
					data.type === 'message_received' ||
					data.type === 'chat_message' ||
					data.type === 'challenge_message' ||
					data.type === 'tournament_invite' ||
					data.type === 'start_game'
				) {
					const chatId = [data.from, data.to].sort().join('-');
					setMessages((prev) => {
						const existingMessages = prev[chatId] || [];
						const isDuplicate = existingMessages.some(
							(msg) =>
								msg.id === data.id ||
								(msg.from === data.from &&
									msg.message === data.message &&
									Math.abs(msg.timestamp - data.timestamp) < 1000)
						);

						if (isDuplicate) return prev;

						return { ...prev, [chatId]: [...existingMessages, data] };
					});

					if (
						data.from !== currentUser &&
						(!isChatOpenRef.current || activeChatRef.current !== data.from)
					) {
						setUnreadChats((prev) => new Set(prev).add(chatId));
					}
				}
			};

			ws.onclose = (event) => {
				setIsConnected(false);
				clearInterval(pingInterval);

				if (
					!isReconnecting &&
					activeChatRef.current &&
					shouldReconnect &&
					event.code !== 1000
				) {
					setIsReconnecting(true);
					setTimeout(() => {
						if (activeChatRef.current && shouldReconnect) {
							connectToChat(activeChatRef.current);
						}
						setIsReconnecting(false);
					}, 2000);
				}
			};

			ws.onerror = () => {
				clearInterval(pingInterval);
			};

			setSocket(ws);
		},
		[currentUser, shouldReconnect, isReconnecting, socket]
	);

	const sendMessage = useCallback(
		async (message: string, to: string) => {
			if (await checkIfUserBlocked(to, currentUser)) {
				setError(
					'You cannot send a message to a user who you have blocked or who has blocked you.'
				);
				return;
			}

			if (socket?.readyState === WebSocket.OPEN && isConnected) {
				const messageData: Message = {
					type: 'chat_message',
					id: `${currentUser}-${Date.now()}-${Math.random()}`,
					from: currentUser,
					to,
					message,
					timestamp: Date.now(),
				};

				socket.send(JSON.stringify(messageData));
			}
		},
		[socket, isConnected, currentUser]
	);

	const markChatAsUnread = useCallback(
		(friendUsername: string) => {
			const chatId = [currentUser, friendUsername].sort().join('-');

			setUnreadChats((prev) => {
				const newSet = new Set(prev);
				newSet.add(chatId);
				return newSet;
			});
		},
		[currentUser]
	);

	const sendChallengeMessage = useCallback(
		(to: string) => {
			if (socket?.readyState === WebSocket.OPEN && isConnected) {
				const challengeData: Message = {
					type: 'challenge_message',
					id: `challenge-${Date.now()}`,
					from: currentUser,
					to,
					message: `${currentUser} ti ha sfidato!`,
					timestamp: Date.now(),
					challengeStatus: 'pending',
				};

				const chatId = [currentUser, to].sort().join('-');
				setMessages((prev) => ({
					...prev,
					[chatId]: [...(prev[chatId] || []), challengeData],
				}));

				socket.send(JSON.stringify(challengeData));
			}
		},
		[socket, isConnected, currentUser]
	);

	const markChatAsRead = useCallback((chatId: string) => {
		setUnreadChats((prev) => {
			const newSet = new Set(prev);
			newSet.delete(chatId);
			return newSet;
		});
	}, []);

	const updateMessageStatus = useCallback((chatId: string, messageId: string, status: string) => {
		setMessages((prev) => {
			const existing = prev[chatId] || [];
			const updated = existing.map((msg) => {
				const matches =
					msg.id === messageId ||
					msg.challengeId === messageId ||
					msg.matchId === messageId;
				if (!matches) return msg;

				if (msg.type === 'tournament_invite' || msg.messageType === 'tournament_invite') {
					return { ...msg, inviteStatus: status };
				}

				return { ...msg, challengeStatus: status };
			});
			return { ...prev, [chatId]: updated };
		});
	}, []);

	const updateChallengeStatus = updateMessageStatus;
	const updateInviteStatus = updateMessageStatus;

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const disconnectChat = useCallback(() => {
		setShouldReconnect(false);
		if (socket) {
			socket.close();
			setSocket(null);
			setIsConnected(false);
			setActiveChat(null);
		}
	}, [socket]);

	const toggleChat = () => {
		setIsChatOpen((prev) => !prev);
	};

	const showChat = async (friendUsername: string) => {
		setShouldReconnect(true);
		setActiveChat(friendUsername);

		const chatId = [currentUser, friendUsername].sort().join('-');
		setUnreadChats((prev) => {
			const newSet = new Set(prev);
			newSet.delete(chatId);
			return newSet;
		});

		if (!isChatOpen) {
			setIsChatOpen(true);
		}

		await loadChatHistory(friendUsername);
		connectToChat(friendUsername);

		try {
			await chatAPI.markChatAsRead(currentUser, friendUsername);
		} catch (error) {
			console.error('Failed to mark chat as read:', error);
		}
	};

	useEffect(() => {
		return () => {
			setShouldReconnect(false);
			socket?.close(1000, 'Component unmounting');
		};
	}, [socket]);

	useEffect(() => {
		const handleGlobalChallenge = (e: Event) => {
			const data = (e as CustomEvent).detail as Message;
			if (!data || data.type !== 'challenge_message') return;

			const chatId = [data.from, data.to].sort().join('-');
			setMessages((prev) => {
				const existingMessages = prev[chatId] || [];
				const isDuplicate = existingMessages.some((msg) => msg.id === data.id);
				if (isDuplicate) return prev;
				return { ...prev, [chatId]: [...existingMessages, data] };
			});

			if (data.from !== currentUser) {
				setUnreadChats((prev) => new Set(prev).add(chatId));
			}

			if (!isChatOpenRef.current || activeChatRef.current !== data.from) {
				setActiveChat(data.from);
				setIsChatOpen(true);
			}
		};

		const handleMessageNotification = (e: Event) => {
			const data = (e as CustomEvent).detail;
			if (!data?.from) return;

			const chatId = [data.from, currentUser].sort().join('-');

			const messageData: Message = {
				id: data.id || `${Date.now()}-${Math.random()}`,
				from: data.from,
				to: data.to || currentUser,
				message: data.message,
				timestamp: data.timestamp || Date.now(),
				type: data.messageType || data.type,
				messageType: data.messageType || data.type,
				matchId: data.matchId,
				groupId: data.groupId,
				challenger: data.challenger,
				opponent: data.opponent,
				inviteStatus: data.inviteStatus,
			};

			setMessages((prev) => {
				const existingMessages = prev[chatId] || [];
				const isDuplicate = existingMessages.some(
					(msg) =>
						msg.id === messageData.id ||
						(msg.from === messageData.from &&
							msg.message === messageData.message &&
							Math.abs(msg.timestamp - messageData.timestamp) < 1000)
				);
				if (isDuplicate) return prev;
				return { ...prev, [chatId]: [...existingMessages, messageData] };
			});

			if (data.messageType === 'tournament_invite') {
				setActiveChat(data.from);
				setIsChatOpen(true);
			} else if (!isChatOpenRef.current || activeChatRef.current !== data.from) {
				setUnreadChats((prev) => new Set(prev).add(chatId));
			}
		};

		const handleGlobalTournamentInvite = (e: Event) => {
			const data = (e as CustomEvent).detail as any;
			if (
				!data ||
				(data.type !== 'tournament_invite' && data.messageType !== 'tournament_invite')
			)
				return;

			const chatId = [data.from, data.to || currentUser].sort().join('-');
			const messageData: Message = {
				id: data.id || `${Date.now()}-${Math.random()}`,
				from: data.from,
				to: data.to || currentUser,
				message: data.message,
				timestamp: data.timestamp || Date.now(),
				type: 'tournament_invite',
				messageType: 'tournament_invite',
				matchId: data.matchId,
				groupId: data.groupId,
				challenger: data.challenger,
				opponent: data.opponent,
				inviteStatus: data.inviteStatus,
			};

			setMessages((prev) => {
				const existingMessages = prev[chatId] || [];
				const isDuplicate = existingMessages.some(
					(msg) =>
						msg.id === messageData.id ||
						(msg.from === messageData.from &&
							msg.message === messageData.message &&
							Math.abs(msg.timestamp - messageData.timestamp) < 1000)
				);
				if (isDuplicate) return prev;
				return { ...prev, [chatId]: [...existingMessages, messageData] };
			});

			setActiveChat(data.from);
			setIsChatOpen(true);
			setUnreadChats((prev) => new Set(prev).add(chatId));
		};

		window.addEventListener('global:challenge_message', handleGlobalChallenge);
		window.addEventListener('global:message_notification', handleMessageNotification);
		window.addEventListener('global:tournament_invite', handleGlobalTournamentInvite);

		return () => {
			window.removeEventListener('global:challenge_message', handleGlobalChallenge);
			window.removeEventListener('global:message_notification', handleMessageNotification);
			window.removeEventListener('global:tournament_invite', handleGlobalTournamentInvite);
		};
	}, [currentUser]);

	// Mark chat as read when opened
	useEffect(() => {
		if (isChatOpen && activeChat) {
			const chatId = [currentUser, activeChat].sort().join('-');
			markChatAsRead(chatId);
		}
	}, [isChatOpen, activeChat, currentUser, markChatAsRead]);

	const value: ChatContextType = {
		isChatOpen,
		toggleChat,
		activeChat,
		showChat,
		sendMessage,
		sendChallengeMessage,
		messages,
		isConnected,
		loadChatHistory,
		disconnectChat,
		notification: unreadChats.size > 0,
		unreadChats,
		markChatAsRead,
		updateChallengeStatus,
		updateInviteStatus,
		error,
		clearError,
		markChatAsUnread,
	};

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error('useChat must be used within a ChatProvider');
	}
	return context;
}
