import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function addBlockedUsers(
	blockerNickname: string,
	blockedNicknames: string[]
): Promise<void> {
	try {
		for (const blockedNickname of blockedNicknames) {
			const existing = await prisma.blocked.findFirst({
				where: {
					OR: [
						{
							blocker_nickname: blockerNickname,
							blocked_user_nickname: blockedNickname,
						},
						{
							blocker_nickname: blockedNickname,
							blocked_user_nickname: blockerNickname,
						},
					],
				},
			});

			if (existing) {
				continue;
			}
			await prisma.blocked.create({
				data: {
					blocker_nickname: blockerNickname,
					blocked_user_nickname: blockedNickname,
				},
			});
		}
	} catch (error) {
		console.error('Error adding blocked users:', error);
	}
}

export async function removeBlockUsers(
	blockerNickname: string,
	blockedNicknames: string
): Promise<void> {
	try {
		const deleted = await prisma.blocked.deleteMany({
			where: {
				blocker_nickname: blockerNickname,
				blocked_user_nickname: blockedNicknames,
			},
		});
	} catch (error) {
		console.error('Error removing blocked users:', error);
	}
}

export async function isUserBlocked(
	blockerNickname: string,
	blockedNickname: string
): Promise<boolean> {
	try {
		const blocked_or_blocking = await prisma.blocked.findFirst({
			where: {
				OR: [
					{
						blocker_nickname: blockerNickname,
						blocked_user_nickname: blockedNickname,
					},
					{
						blocker_nickname: blockedNickname,
						blocked_user_nickname: blockerNickname,
					},
				],
			},
		});
		return blocked_or_blocking !== null;
	} catch (error) {
		console.error('Error checking blocked user:', error);
		return false;
	}
}

export async function whoDidIBlocked(blockerNickname: string): Promise<string[]> {
	try {
		const records = await prisma.blocked.findMany({
			where: {
				blocker_nickname: blockerNickname,
			},
		});
		return records.map((record) => record.blocked_user_nickname);
	} catch (error) {
		console.error('Error retrieving blocked users:', error);
		return [];
	}
}

export async function whoBlockedMe(blockedNickname: string): Promise<string[]> {
	try {
		const records = await prisma.blocked.findMany({
			where: {
				blocked_user_nickname: blockedNickname,
			},
		});
		return records.map((record) => record.blocker_nickname);
	} catch (error) {
		console.error('Error retrieving users who blocked me:', error);
		return [];
	}
}

export async function getAllBlockedRelations(
	nickname: string
): Promise<{ blocker_nickname: string; blocked_user_nickname: string }[]> {
	const blocks = await prisma.blocked.findMany({
		where: {
			OR: [{ blocker_nickname: nickname }, { blocked_user_nickname: nickname }],
		},
	});
	return blocks;
}
