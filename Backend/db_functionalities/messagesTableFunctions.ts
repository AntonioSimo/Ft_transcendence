import prisma from './prismaClient';
import { Message, User } from '@prisma/client';

export async function getMessagesByGroupId(groupId: string): Promise<Message[]> {
	try {
		return await prisma.message.findMany({
			where: { groupId },
		});
	} catch (error) {
		console.error('Error fetching messages by group ID:', error);
		throw error;
	}
}

export async function createMessage(messageData: {
	message: string;
	sender_Nickname: string;
	groupId: string;
	type?: string;
	matchId?: string;
	challengeId?: string;
	challengeStatus?: string;
}): Promise<Message> {
	try {
		return await prisma.message.create({
			data: {
				message: messageData.message,
				sender_Nickname: messageData.sender_Nickname,
				groupId: messageData.groupId,
				type: messageData.type,
				matchId: messageData.matchId,
				challengeId: messageData.challengeId,
				challengeStatus: messageData.challengeStatus,
			},
		});
	} catch (error) {
		console.error('Error creating message:', error);
		throw error;
	}
}

export async function checkIfMessageIsRead(messageId: string, userId: string): Promise<boolean> {
	try {
		const message = await prisma.message.findUnique({
			where: { id: messageId },
			select: {
				created_at: true,
			},
		});
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				last_loginTime: true,
			},
		});
		console.log('User, Message:', { user, message });
		console.log('Message created_at:', message?.created_at);
		console.log('User last_loginTime:', user?.last_loginTime);
		if (!message || !user) {
			console.error('Message or user not found');
			return false;
		}
		if (user.last_loginTime && message.created_at) {
			return user.last_loginTime > message.created_at;
		}
		return false;
	} catch (error) {
		console.error('Error checking if message is read:', error);
		return false;
	}
}
