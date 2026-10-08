import { useEffect, useRef, useState } from 'react';
import { createWebSocketUrl } from '../../config/api';

export function useGlobalSocket() {
	const socketRef = useRef<WebSocket | null>(null);
	const [nickname, setNickname] = useState<string | null>(null);

	useEffect(() => {
		if (localStorage.getItem('nickname') === null) return;
		const storedNickname = localStorage.getItem('nickname');
		if (storedNickname !== nickname) setNickname(storedNickname);
	}, [nickname]);

	useEffect(() => {
		if (!nickname) return;
		if (socketRef.current) socketRef.current.close();

		const globalSocket = new WebSocket(createWebSocketUrl('/global'));

		// IMPORTANT: Set up event handlers BEFORE assigning to ref
		// This prevents losing messages that arrive immediately after connection
		globalSocket.onopen = () => {
			globalSocket.send(JSON.stringify({ type: 'connect_user', currentUser: nickname }));
			if ('Notification' in window && Notification.permission === 'default')
				Notification.requestPermission();
			const pingInterval = setInterval(() => {
				if (globalSocket.readyState === WebSocket.OPEN)
					globalSocket.send(JSON.stringify({ type: 'ping' }));
			}, 30000);
			(globalSocket as any).pingInterval = pingInterval;
		};

		globalSocket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				switch (data.type) {
					case 'connected':
						break;
					case 'pong':
						break;
					case 'message_notification':
						if ('Notification' in window && Notification.permission === 'granted')
							new Notification(`New message from ${data.from}`, {
								body: data.message,
								icon: '/logo.jpg',
							});
						const msgEvent = new CustomEvent('global:message_notification', {
							detail: data,
						});
						window.dispatchEvent(msgEvent);
						break;
					case 'challenge_message':
						if ('Notification' in window && Notification.permission === 'granted')
							new Notification(`Game Challenge from ${data.from}`, {
								body: 'You have been challenged to a game!',
								icon: '/logo.jpg',
							});
						// Propagate to chat context so the challenge card is rendered immediately
						const challengeEvent = new CustomEvent('global:challenge_message', {
							detail: data,
						});
						window.dispatchEvent(challengeEvent);
						break;
					case 'tournament_invite':
						if ('Notification' in window && Notification.permission === 'granted')
							new Notification(`Tournament Invite from ${data.from}`, {
								body: data.message || 'You have been invited to join a tournament!',
								icon: '/logo.jpg',
							});
						const tournamentEvent = new CustomEvent('global:tournament_invite', {
							detail: data,
						});
						window.dispatchEvent(tournamentEvent);
						break;
					case 'player_joined':
					case 'tournament_player_joined':
						const joinEvent = new CustomEvent('global:tournament_player_joined', {
							detail: data,
						});
						window.dispatchEvent(joinEvent);
						break;
					case 'tournament_ready_update':
						const readyEvent = new CustomEvent('global:tournament_ready_update', {
							detail: data,
						});
						window.dispatchEvent(readyEvent);
						break;
					case 'tournament_invite_declined':
						const matchCancelledQueue = (window as any).__matchCancelledQueue || [];
						matchCancelledQueue.push(data);
						(window as any).__matchCancelledQueue = matchCancelledQueue;
						const declineEvent = new CustomEvent('global:tournament_invite_declined', {
							detail: data,
						});
						window.dispatchEvent(declineEvent);
						// Also surface as a generic match cancellation for in-game listeners
						const matchCancelledFromDecline = new CustomEvent(
							'global:match_cancelled',
							{ detail: data }
						);
						window.dispatchEvent(matchCancelledFromDecline);
						break;
					case 'tournament_cancelled':
						const cancelEvent = new CustomEvent('global:tournament_cancelled', {
							detail: data,
						});
						window.dispatchEvent(cancelEvent);
						break;

					case 'tournament_matchResult':
						const matchResultEvent = new CustomEvent('global:tournament_matchResult', {
							detail: data,
						});
						window.dispatchEvent(matchResultEvent);
						break;
					case 'start_game':
						if ('Notification' in window && Notification.permission === 'granted')
							new Notification('Game starting', {
								body: `${data.challenger || data.from} vs ${data.opponent || data.to} — joining game...`,
								icon: '/logo.jpg',
							});
						const startGameQueue = (window as any).__startGameQueue || [];
						startGameQueue.push(data);
						(window as any).__startGameQueue = startGameQueue;
						const ev2 = new CustomEvent('global:start_game', { detail: data });
						window.dispatchEvent(ev2);
						break;
					default:
				}
			} catch (error) {
				console.error('Error parsing global socket message:', error);
			}
		};

		globalSocket.onclose = () => {
			if ((globalSocket as any).pingInterval)
				clearInterval((globalSocket as any).pingInterval);
		};

		// Assign to ref AFTER all handlers are set up
		socketRef.current = globalSocket;

		// Assign to ref AFTER all handlers are set up
		socketRef.current = globalSocket;

		return () => {
			if (socketRef.current) socketRef.current.close(1000, 'Component unmounting');
		};
	}, [nickname]);

	return socketRef.current;
}

export function GlobalSocketProvider({ children }: { children: React.ReactNode }) {
	useGlobalSocket();
	return <>{children}</>;
}
