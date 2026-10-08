import axios from 'axios';
import { createApiUrl } from '../../config/api';
import * as blocking from './blockedUsers';

export interface User {
	username: string;
	status: 'online' | 'offline';
}

export interface FriendRequest {
	sender: string;
}

export interface SocialError {
	message: string;
	status?: number;
}

export const socialAPI = {
	async fetchAllUsers() {
		try {
			const response = await fetch(createApiUrl('/api/nicknames'));
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Failed to fetch users:', error);
			throw error;
		}
	},

	async fetchUsers(currentNickname: string): Promise<User[]> {
		try {
			const data = await this.fetchAllUsers();
			const usersBlocked = await blocking.getUsersIBlocked(currentNickname);
			const usersWhoBlockedMe = await blocking.getUsersWhoBlockedMe(currentNickname);

			const userData = data
				.map((user: any) => ({
					username: user.nickname,
					status: user.status ? 'online' : 'offline',
				}))
				.filter((user: User) => user.username !== currentNickname)
				.filter((user: User) => !usersBlocked.includes(user.username))
				.filter((user: User) => !usersWhoBlockedMe.includes(user.username));

			return userData;
		} catch (error) {
			console.error('Failed to fetch users:', error);
			throw error;
		}
	},

	async getFriends(nickname: string): Promise<User[]> {
		try {
			if (!nickname) return [];

			const response = await fetch(createApiUrl('/api/friends'), {
				headers: { 'curr-user': nickname },
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to fetch friends');
			}

			const data = await response.json();
			return data.map((friend: any) => ({
				username: friend.nickname,
				status: friend.status ? 'online' : 'offline',
			}));
		} catch (error) {
			console.error('Failed to fetch friends:', error);
			throw error;
		}
	},

	async fetchFriendRequests(nickname: string): Promise<FriendRequest[]> {
		try {
			if (!nickname) return [];

			const response = await fetch(createApiUrl('/api/friend-requests-received'), {
				headers: { 'curr-user': nickname },
			});
			const data = await response.json();

			const mappedRequests = data.map((item: any) => ({
				sender: item.fromNickname,
			}));

			return mappedRequests;
		} catch (error) {
			console.error('Failed to fetch friend requests:', error);
			throw error;
		}
	},

	async fetchBlockedUsers(nickname: string): Promise<User[]> {
		try {
			if (!nickname) return [];

			const response = await blocking.getUsersIBlocked(nickname);
			const blockedUsersData: User[] = response.map((username: string) => ({
				username,
				status: 'offline' as const,
			}));

			return blockedUsersData;
		} catch (error) {
			console.error('Failed to fetch blocked users:', error);
			throw error;
		}
	},

	async inviteFriend(nickname: string, friendNickname: string) {
		try {
			return await axios.post(createApiUrl('/api/friend-requests'), {
				nickname,
				friendNickname,
			});
		} catch (error: any) {
			const message = error.response?.data || 'Friend request already exists.';
			throw {
				message,
				status: error.response?.status,
			} as SocialError;
		}
	},

	async acceptFriendRequest(nickname: string, friendNickname: string) {
		try {
			return await axios.post(createApiUrl('/api/friend-requests-accept'), {
				nickname,
				friendNickname,
			});
		} catch (error: any) {
			throw {
				message: 'Failed to accept friend request.',
				status: error.response?.status,
			} as SocialError;
		}
	},

	async declineFriendRequest(nickname: string, friendNickname: string) {
		try {
			return await axios.post(createApiUrl('/api/friend-requests-decline'), {
				nickname,
				friendNickname,
			});
		} catch (error: any) {
			throw {
				message: 'Failed to decline friend request.',
				status: error.response?.status,
			} as SocialError;
		}
	},

	async removeFriend(nickname: string, friendNickname: string) {
		try {
			return await axios.post(createApiUrl('/api/remove-friends'), {
				nickname,
				friendNickname,
			});
		} catch (error: any) {
			throw {
				message: 'Failed to remove friend.',
				status: error.response?.status,
			} as SocialError;
		}
	},

	async challengeFriend(creator: string, opponent: string) {
		try {
			return await axios.post(
				createApiUrl('/api/challenge-friend'),
				{ creator, opponent },
				{ withCredentials: true }
			);
		} catch (error: any) {
			console.error('Error creating match:', error);
			throw {
				message: 'Failed to create challenge.',
				status: error.response?.status,
			} as SocialError;
		}
	},

	async blockUserAction(nickname: string, userToBlock: string): Promise<boolean> {
		try {
			const response = await blocking.blockUser(nickname, [userToBlock]);
			return response;
		} catch (error) {
			throw {
				message: `Failed to block ${userToBlock}.`,
			} as SocialError;
		}
	},

	async unblockUserAction(nickname: string, userToUnblock: string): Promise<boolean> {
		try {
			const response = await blocking.unblockUser(nickname, userToUnblock);
			return response;
		} catch (error) {
			throw {
				message: `Failed to unblock ${userToUnblock}.`,
			} as SocialError;
		}
	},

	async logoutStatus(nickname: string) {
		return await fetch(createApiUrl('/api/logout-status'), {
			method: 'POST',
			headers: { 'curr-user': nickname },
			credentials: 'include',
		});
	},

	async blockUser(blockerNickname: string, blockedNicknames: string[]) {
		return await axios.post(createApiUrl('/api/block'), {
			blockerNickname,
			blockedNicknames,
		});
	},

	async unblockUser(blockerNickname: string, unblockedNicknames: string[]) {
		return await axios.post(createApiUrl('/api/unblock'), {
			blockerNickname,
			unblockedNicknames,
		});
	},

	async getBlockedUsers(nickname: string) {
		const response = await axios.get(createApiUrl(`/api/blocked-users/${nickname}`));
		return response.data;
	},
};
