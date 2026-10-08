import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';

const gameServerSocket = 'ws://localhost:4000/connect/';
let gameServerConnection: WebSocket | null = null;

function connectToGameServer(id: string, action: string) {
	gameServerConnection = new WebSocket(gameServerSocket);
}

export async function matchMaking(fastify: FastifyInstance) {
	fastify.post<{ Body: { matchId: string } }>(
		'/api/connect-tournament',
		async (request, reply) => {
			const { matchId } = request.body;

			connectToGameServer(matchId, 'joinTournament');
			if (!matchId) return reply.status(400).send({ message: 'matchId is required' });
			if (gameServerConnection && gameServerConnection.readyState === WebSocket.OPEN) {
				gameServerConnection.send(
					JSON.stringify({
						action: 'joinTournament',
						id: matchId,
					})
				);
				return reply.status(200).send({ message: 'Tournament connected' });
			} else {
				return reply.status(500).send({ message: 'Game server not connected' });
			}
		}
	);
}
