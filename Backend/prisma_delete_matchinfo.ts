const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
	try {
		const result = await prisma.matchInfo.deleteMany({});
		const msg = await prisma.message.deleteMany({});
		console.log(`Deleted ${msg.count} Message records.`);
		console.log(`Deleted ${result.count} MatchInfo records.`);
	} catch (error) {
		console.error('Error deleting MatchInfo:', error);
	} finally {
		await prisma.$disconnect();
	}
}

main();
