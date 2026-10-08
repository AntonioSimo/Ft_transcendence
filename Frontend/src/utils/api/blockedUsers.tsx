import { createApiUrl } from '../../config/api';

export async function checkIfUserBlocked(
	blockerNickname: string,
	blockedNickname: string
): Promise<boolean> {
	try {
		const response = await fetch(createApiUrl('/api/checkBlock'), {
			method: 'GET',
			credentials: 'include',
			headers: {
				'blocker-nickname': blockerNickname,
				'blocked-nickname': blockedNickname,
			},
		});
		if (!response.ok) {
			console.error('Failed to check block status');
			return false;
		}
		const data = await response.json();
		return Boolean(data.blocked) || false;
	} catch (error) {
		console.error('Error checking block status:', error);
		return false;
	}
}

export async function getUsersIBlocked(nickname: string): Promise<string[]> {
	const url = createApiUrl(`/api/whoDidIBlocked?blockerNickname=${encodeURIComponent(nickname)}`);
	const response = await fetch(url, {
		method: 'GET',
		credentials: 'include',
	});
	if (!response.ok) return [];
	const data = await response.json();
	return data.blockedUsers ?? [];
}

export async function getUsersWhoBlockedMe(nickname: string): Promise<string[]> {
	const url = createApiUrl(`/api/whoBlockedMe?blockedNickname=${encodeURIComponent(nickname)}`);
	const response = await fetch(url, {
		method: 'GET',
		credentials: 'include',
	});
	if (!response.ok) return [];
	const data = await response.json();
	return data.blockingUsers ?? [];
}

export async function getAllBlockedUsers(nickname: string): Promise<string[]> {
	const blockedByMe = await getUsersIBlocked(nickname);
	const blockedMe = await getUsersWhoBlockedMe(nickname);
	return Array.from(new Set([...blockedByMe, ...blockedMe]));
}

export async function blockUser(
	blockerNickname: string,
	blockedNicknames: string[]
): Promise<boolean> {
	try {
		const response = await fetch(createApiUrl('/api/block'), {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				blockerNickname,
				blockedNicknames,
			}),
		});
		if (!response.ok) {
			console.error('Failed to block user(s)');
			return false;
		}
		return true;
	} catch (error) {
		console.error('Error blocking user(s):', error);
		return false;
	}
}

export async function unblockUser(
	blockerNickname: string,
	blockedNickname: string
): Promise<boolean> {
	try {
		const response = await fetch(createApiUrl('/api/unblock'), {
			method: 'DELETE',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				blockerNickname,
				unblockedNicknames: blockedNickname,
			}),
		});
		if (!response.ok) {
			console.error('Failed to unblock user');
			return false;
		}
		return true;
	} catch (error) {
		console.error('Error unblocking user:', error);
		return false;
	}
}
