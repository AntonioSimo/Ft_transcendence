import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface userLoginDetails {
	email_nickname: string;
	password: string;
}

export async function loginUser({
	email_nickname,
	password,
}: userLoginDetails): Promise<User | null> {
	try {
		const user = await prisma.user.findFirst({
			where: {
				OR: [{ email: email_nickname }, { nickname: email_nickname }],
			},
		});
		if (!user) {
			throw new Error('Invalid credentials');
		}

		// Check if user has a password (OAuth users might not have one)
		if (!user.password) {
			throw new Error('User has no password - please use OAuth login');
		}

		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			throw new Error('Invalid Password');
		}
		return user;
	} catch (error) {
		console.error('Error logging in user:', error);
		throw error;
	}
}
