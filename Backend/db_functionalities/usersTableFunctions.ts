import prisma, { User, Blocked, Group, Message } from './prismaClient';
import { createGroup } from './groupsTableFunctions';
import fs from 'fs';
import path from 'path';

export async function getAllUsers(): Promise<User[]> {
	try {
		return await prisma.user.findMany();
	} catch (error) {
		console.error('Error fetching users:', error);
		throw error;
	}
}

export async function getUserByNickname(nickname: string) {
	return await prisma.user.findUnique({
		where: { nickname },
	});
}

export async function getUserAvatar(userNickname: string): Promise<string> {
	try {
		const user = await prisma.user.findUnique({
			where: { nickname: userNickname },
			select: { avatar_id: true },
		});
		if (!user) throw new Error(`User with nickname ${userNickname} not found`);
		const avatarPath = path.join(process.cwd(), 'avatars', user.avatar_id);
		if (!fs.existsSync(avatarPath)) {
			const updatedUser = await prisma.user.update({
				where: { nickname: userNickname },
				data: { avatar_id: 'default_avatar.png' },
			});
			return updatedUser.avatar_id;
		}
		return user.avatar_id;
	} catch (error) {
		console.error('Error fetching user avatar:', error);
		throw error;
	}
}

export async function getUserTournamentAlias(userNickname: string): Promise<string> {
	try {
		const user = await prisma.user.findUnique({
			where: { nickname: userNickname },
			select: { tournament_alias: true },
		});

		if (!user) throw new Error(`User with nickname ${userNickname} not found`);
		return user.tournament_alias;
	} catch (error) {
		console.error('Error fetching user tournament alias:', error);
		throw error;
	}
}

export async function getNumberOfFriendsOnline(nickname: string): Promise<number> {
	try {
		const friends = await getNicknameFriendsFromGroupByNickname(nickname);
		const onlineFriends = friends.filter((friend) => friend.status === true);
		return onlineFriends.length;
	} catch (error) {
		console.error('Error fetching number of friends online:', error);
		throw error;
	}
}

export async function updateUserEmail(userNickname: string, newEmail: string): Promise<string> {
	const user = await getUserByNickname(userNickname);
	if (!user) throw new Error(`User with nickname ${userNickname} not found`);
	if (user.OAuth2) throw new Error('Cannot change email for Google OAuth2 users');

	try {
		const existingUser = await prisma.user.findUnique({
			where: { email: newEmail },
		});

		if (existingUser && existingUser.nickname !== userNickname) {
			throw new Error('already exists');
		}

		const updatedUser = await prisma.user.update({
			where: { nickname: userNickname },
			data: { email: newEmail },
		});

		return updatedUser.email;
	} catch (error) {
		console.error('Error updating user email:', error);
		throw error;
	}
}

export async function updateUserTournamentAlias(
	userNickname: string,
	newAlias: string
): Promise<string> {
	try {
		const existingUser = await prisma.user.findUnique({
			where: { tournament_alias: newAlias },
		});

		if (existingUser && existingUser.nickname !== userNickname) {
			throw new Error('already exists');
		}

		const updatedUser = await prisma.user.update({
			where: { nickname: userNickname },
			data: { tournament_alias: newAlias },
		});

		return updatedUser.tournament_alias;
	} catch (error) {
		console.error('Error updating user tournament alias:', error);
		throw error;
	}
}

export async function getBlockedUsers(userNickname: string): Promise<Blocked[]> {
	try {
		return await prisma.blocked.findMany({
			where: { blocker_nickname: userNickname },
		});
	} catch (error) {
		console.error('Error fetching blocked users:', error);
		throw error;
	}
}

export async function updateUserOnlineStatus(nickname: string, isOnline: boolean): Promise<void> {
	// Use updateMany to avoid throwing P2025 when the user does not exist
	await prisma.user.updateMany({
		where: { nickname },
		data: { is_online: isOnline },
	});
}

export async function getNicknameFriendsFromGroupByNickname(
	nickname: string
): Promise<{ nickname: string; status: boolean }[]> {
	try {
		await getUserByNickname(nickname);

		const groups = await prisma.group.findMany({
			where: {
				Users: {
					some: { nickname },
				},
			},
			select: {
				Users: {
					select: {
						nickname: true,
						is_online: true,
						tournament_alias: true,
					},
				},
			},
		});

		const allUsers = groups
			.flatMap((group) => group.Users)
			.filter((user) => user.nickname !== nickname);

		const uniqueUsersMap = new Map<
			string,
			{ nickname: string; status: boolean; tournament_alias?: string }
		>();

		allUsers.forEach((user) => {
			if (!uniqueUsersMap.has(user.nickname)) {
				uniqueUsersMap.set(user.nickname, {
					nickname: user.nickname,
					status: user.is_online,
					tournament_alias: user.tournament_alias,
				});
			}
		});
		return Array.from(uniqueUsersMap.values());
	} catch (error) {
		console.error('Error fetching friends by nickname:', error);
		throw error;
	}
}

export async function addFriendRequest(nickname: string, friendNickname: string) {
	try {
		const user = await getUserByNickname(nickname);
		const friend = await getUserByNickname(friendNickname);

		if (!user || !friend) {
			throw new Error('User or friend not found');
		}
		await prisma.friendRequest.create({
			data: {
				fromNickname: nickname,
				toNickname: friendNickname,
				status: 'pending',
			},
		});
	} catch (error) {
		console.error('Error adding friend request:', error);
		throw error;
	}
}

export async function getFriendRequestBetween(nickname: string, friendNickname: string) {
	try {
		return await prisma.friendRequest.findFirst({
			where: {
				fromNickname: nickname,
				toNickname: friendNickname,
			},
		});
	} catch (error) {
		console.error('Error fetching friend request:', error);
		throw error;
	}
}

export async function alreadyFriends(nickname: string, friendNickname: string): Promise<boolean> {
	try {
		const groups = await prisma.group.findMany({
			where: {
				Users: {
					some: { nickname },
				},
			},
			include: {
				Users: true,
			},
		});

		return groups.some((group) => group.Users.some((user) => user.nickname === friendNickname));
	} catch (error) {
		console.error('Error checking if users are already friends:', error);
		throw error;
	}
}

export async function getFriendRequestsReceived(nickname: string) {
	try {
		return await prisma.friendRequest.findMany({
			where: { toNickname: nickname, status: 'pending' },
			select: { fromNickname: true },
		});
	} catch (error) {
		console.error('Error fetching friend requests received:', error);
		throw error;
	}
}

export async function getFriendRequestsSent(nickname: string) {
	try {
		return await prisma.friendRequest.findMany({
			where: { fromNickname: nickname, status: 'pending' },
			select: { toNickname: true },
		});
	} catch (error) {
		console.error('Error fetching friend requests sent:', error);
		throw error;
	}
}

export async function acceptFriendRequest(nickname: string, friendNickname: string) {
	try {
		const request = await getFriendRequestBetween(friendNickname, nickname);
		if (!request) {
			throw new Error('Friend request not found');
		}

		await prisma.friendRequest.delete({
			where: { id: request.id },
		});
		const group = await createGroup([nickname, friendNickname]);
		return group;
	} catch (error) {
		console.error('Error accepting friend request:', error);
		throw error;
	}
}

export async function declineFriendRequest(nickname: string, friendNickname: string) {
	try {
		const request = await getFriendRequestBetween(friendNickname, nickname);
		if (!request) {
			throw new Error('Friend request not found');
		}

		await prisma.friendRequest.delete({
			where: { id: request.id },
		});
	} catch (error) {
		console.error('Error declining friend request:', error);
		throw error;
	}
}

export async function removeFriend(nickname: string, friendNickname: string) {
	try {
		const group = await prisma.group.findFirst({
			where: {
				AND: [
					{ Users: { some: { nickname } } },
					{ Users: { some: { nickname: friendNickname } } },
				],
			},
			include: { Users: true },
		});
		if (!group) {
			throw new Error('Group not found or not friends');
		}
		const userToRemove = group.Users.find((user) => user.nickname === friendNickname);
		if (!userToRemove) {
			throw new Error('Already not friends');
		}
		if (group.Users.length === 2) {
			await prisma.message.deleteMany({
				where: { groupId: group.id },
			});
			await prisma.group.delete({ where: { id: group.id } });
			return null;
		}
		return await prisma.group.update({
			where: { id: group.id },
			data: {
				Users: {
					disconnect: { nickname: userToRemove.nickname },
				},
			},
		});
	} catch (error) {
		console.error('Error removing friend:', error);
		throw error;
	}
}

export async function blockUser(blockerNickname: string, blockedNickname: string) {
	try {
		const blocker = await getUserByNickname(blockerNickname);
		const blocked = await getUserByNickname(blockedNickname);

		if (!blocker || !blocked) {
			throw new Error('Blocker or blocked user not found');
		}

		return await prisma.blocked.create({
			data: {
				blocker_nickname: blockerNickname,
				blocked_user_nickname: blockedNickname,
			},
		});
	} catch (error) {
		console.error('Error blocking user:', error);
		throw error;
	}
}

export async function updateUserAvatar(nickname: string, avatarId: string): Promise<User> {
	try {
		return await prisma.user.update({
			where: { nickname },
			data: { avatar_id: avatarId },
		});
	} catch (error) {
		console.error('Error updating user avatar:', error);
		throw error;
	}
}

export async function updateLastLoginTime(nickname: string, loginTime: Date): Promise<User> {
	try {
		return await prisma.user.update({
			where: { nickname },
			data: { last_loginTime: loginTime },
		});
	} catch (error) {
		console.error('Error updating last login time:', error);
		throw error;
	}
}
