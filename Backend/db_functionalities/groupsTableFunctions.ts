import prisma from './prismaClient';
import { Group, User, Message } from '@prisma/client';

export async function getAllGroups(): Promise<Group[]> {
	try {
		return await prisma.group.findMany();
	} catch (error) {
		console.error('Error fetching groups:', error);
		throw error;
	}
}

export async function getGroupUsersById(
	groupId: string
): Promise<(Group & { Users: User[] }) | null> {
	try {
		if (!groupId) throw new Error('groupId is required');
		const group = await prisma.group.findUnique({
			where: { id: groupId },
			include: { Users: true },
		});
		return group;
	} catch (error) {
		console.error('Error fetching group users:', error);
		throw error;
	}
}

export async function createGroup(Users: string[]): Promise<Group> {
	try {
		if (!Users || Users.length === 0) throw new Error('Users array is required');

		const group = await prisma.group.create({
			data: {
				Users: {
					connect: Users.map((user) => ({ nickname: user })),
				},
			},
		});
		return group;
	} catch (error) {
		console.error('Error creating group:', error);
		throw error;
	}
}

export async function findDirectMessageGroup(userA: string, userB: string): Promise<Group | null> {
	try {
		if (!userA || !userB) throw new Error('Both user nicknames are required');
		const groups = await prisma.group.findMany({
			include: { Users: true },
		});

		for (const group of groups) {
			const userNicknames = group.Users.map((user) => user.nickname).sort();
			const targetUsers = [userA, userB].sort();
			if (
				userNicknames.length === 2 &&
				userNicknames[0] === targetUsers[0] &&
				userNicknames[1] === targetUsers[1]
			) {
				return group;
			}
		}

		return null;
	} catch (error) {
		console.error('Error finding direct message group:', error);
		throw error;
	}
}
