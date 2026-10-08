import { useEffect, useState } from 'react';
import { socialAPI } from '../utils/api/social';
import type { User, FriendRequest, SocialError } from '../utils/api/social';

type Notification = {
	type: 'success' | 'error';
	message: string;
};

export function useSocialData(nickname: string) {
	const [users, setUsers] = useState<User[]>([]);
	const [friends, setFriends] = useState<User[]>([]);
	const [friendRequest, setFriendRequest] = useState<FriendRequest[]>([]);
	const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
	const [notification, setNotification] = useState<Notification | null>(null);

	const showNotification = (type: 'success' | 'error', message: string) => {
		setNotification({ type, message });
	};

	const fetchAllData = async () => {
		try {
			const [usersData, friendsData, requests, blocked] = await Promise.all([
				socialAPI.fetchUsers(nickname),
				socialAPI.getFriends(nickname),
				socialAPI.fetchFriendRequests(nickname),
				socialAPI.fetchBlockedUsers(nickname),
			]);
			setUsers(usersData);
			setFriends(friendsData);
			setFriendRequest(requests);
			setBlockedUsers(blocked);
		} catch (error) {
			console.error('Failed to fetch data:', error);
		}
	};

	const refreshData = (delay = 500) => {
		setTimeout(() => fetchAllData(), delay);
	};

	useEffect(() => {
		if (!nickname) return;

		fetchAllData();
		const interval = setInterval(fetchAllData, 3000);
		return () => clearInterval(interval);
	}, [nickname]);

	useEffect(() => {
		if (notification) {
			const timer = setTimeout(() => setNotification(null), 3000);
			return () => clearTimeout(timer);
		}
	}, [notification]);

	const handleInvite = async (username: string) => {
		try {
			await socialAPI.inviteFriend(nickname, username);
			showNotification('success', `You invited ${username} to your friends!`);
			refreshData();
		} catch (error) {
			showNotification('error', (error as SocialError).message);
		}
	};

	const handleAccept = async (sender: string) => {
		try {
			await socialAPI.acceptFriendRequest(nickname, sender);
			showNotification('success', `You accepted ${sender}'s friend request!`);
			refreshData();
		} catch (error) {
			showNotification('error', (error as SocialError).message);
		}
	};

	const handleDecline = async (sender: string) => {
		try {
			await socialAPI.declineFriendRequest(nickname, sender);
			showNotification('success', `You declined ${sender}'s friend request.`);
			refreshData();
		} catch (error) {
			showNotification('error', (error as SocialError).message);
		}
	};

	const handleRemoveFriend = async (username: string) => {
		try {
			await socialAPI.removeFriend(nickname, username);
			showNotification('success', `You removed ${username} from your friends!`);
			setFriends((prev) => prev.filter((f) => f.username !== username));
			refreshData(1000);
		} catch (error) {
			showNotification('error', (error as SocialError).message);
		}
	};

	const handleBlock = async (username: string) => {
		try {
			await socialAPI.blockUserAction(nickname, username);
			showNotification('success', `You blocked ${username} successfully!`);
			refreshData();
		} catch (error) {
			showNotification('error', (error as SocialError).message);
		}
	};

	const handleUnblock = async (username: string) => {
		try {
			await socialAPI.unblockUserAction(nickname, username);
			showNotification('success', `You unblocked ${username} successfully!`);
			refreshData();
		} catch (error) {
			showNotification('error', (error as SocialError).message);
		}
	};

	return {
		users,
		friends,
		friendRequest,
		blockedUsers,
		notification,
		handleInvite,
		handleAccept,
		handleDecline,
		handleRemoveFriend,
		handleBlock,
		handleUnblock,
	};
}
