import { PrismaClient, User, Message, Group, Blocked } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
export type { User, Message, Group, Blocked };
