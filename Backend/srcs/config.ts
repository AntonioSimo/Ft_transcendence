import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
	throw new Error('Missing JWT_SECRET in environment variables');
}

export const config = {
	port: parseInt(process.env.PORT || '3000', 10),
	jwt: {
		secret: process.env.JWT_SECRET || 'default-secret',
		expiration: process.env.JWT_EXPIRATION || '1d',
	},
};
