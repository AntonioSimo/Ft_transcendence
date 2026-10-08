import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface AddUserInput {
	nickname: string;
	email: string;
	password?: string;
	OAuth2?: 'google';
}

export async function addUser({ nickname, email, password, OAuth2 }: AddUserInput) {
	const existingUser = await prisma.user.findFirst({
		where: {
			OR: [{ email }, { nickname }],
		},
	});

	if (existingUser) {
		if (existingUser.email === email) throw new Error('EMAIL_EXISTS');
		if (existingUser.nickname === nickname) throw new Error('NICKNAME_EXISTS');
	}

	const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

	const userData: any = {
		nickname,
		email,
		avatar_id: 'default_avatar.png',
		user_type: 'PLAYER',
		tournament_alias: nickname,
		is_online: false,
		last_loginTime: new Date(),
	};

	if (hashedPassword) {
		userData.password = hashedPassword;
	}

	if (OAuth2) {
		userData.OAuth2 = OAuth2;
	}

	const newUser = await prisma.user.create({
		data: userData,
	});

	return {
		id: newUser.id,
		nickname: newUser.nickname,
		email: newUser.email,
		OAuth2: newUser.OAuth2,
	};
}
