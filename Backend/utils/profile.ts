import { PrismaClient } from '@prisma/client';
import {
	getFriendRequestsSent,
	getNicknameFriendsFromGroupByNickname,
	getNumberOfFriendsOnline,
	getUserAvatar,
} from '../db_functionalities/usersTableFunctions';
import { getPlayedAndWinsByUserId } from '../db_functionalities/gameInfoTableFunctions';

const prisma = new PrismaClient();

interface ProfileData {
	nickname: string;
	avatar_id: string;
	is_online: boolean;
	email: string;
	last_loginTime: Date;
	tournament_alias: string;
	friendsNumber: number;
	friendsOnline: number;
	pendingRequests: number;
	played: number;
	wins: number;
}

export async function getProfileData(nickname: string): Promise<ProfileData | null> {
	const user = await prisma.user.findUnique({
		where: { nickname },
		select: {
			id: true,
			nickname: true,
			avatar_id: true,
			is_online: true,
			email: true,
			last_loginTime: true,
			tournament_alias: true,
		},
	});

	if (!user) {
		return null;
	}
	const [{ played, wins }, friends, friendsOnline, pendingRequests, avatar] = await Promise.all([
		getPlayedAndWinsByUserId(user.id),
		getNicknameFriendsFromGroupByNickname(nickname),
		getNumberOfFriendsOnline(nickname),
		getFriendRequestsSent(nickname),
		getUserAvatar(nickname),
	]);
	return {
		nickname: user.nickname,
		avatar_id: avatar,
		is_online: user.is_online,
		email: user.email,
		last_loginTime: user.last_loginTime,
		tournament_alias: user.tournament_alias,
		friendsNumber: friends.length,
		friendsOnline,
		pendingRequests: pendingRequests.length,
		played,
		wins,
	};
}
