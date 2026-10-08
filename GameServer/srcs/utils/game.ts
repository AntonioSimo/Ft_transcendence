import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Lobby, Basic } from './interfaces';
import { randomInt } from 'crypto';
import { createApiUrl } from '../config/api';

const BALL_SIZE = 20;
const PADDLE_HEIGHT = 128;
const PADDLE_WIDTH = 12;
const PADDLE_MARGIN = 24;
const PADDLE_SPEED = 800;
const BALL_SPEED = 8;
const TICK_RATE = 16;
const WIN_SCORE = 11;
const WIN_SCORE_OVERTIME = 2;
const GAME_DURATION = 120; //change to 120
const WIDTH = 1800;
const HEIGHT = 1600;

const lobbies = new Map<string, Lobby>();

function sendToLobby(lobby: Lobby, payload: any) {
	try {
		const msg = JSON.stringify(payload);
		for (const userId of lobby.players) {
			try {
				const wsAny: any = lobby.connections[userId];
				const socket = wsAny?.socket ?? wsAny;
				if (socket && socket.readyState === 1) socket.send(msg);
			} catch {}
		}
	} catch (e) {
		console.error('Error sending message to lobby:', e);
	}
}

function resumeLobbyIfReady(lobby: Lobby) {
	const lobbyAny = lobby as any;
	if (lobby.state !== 'paused') return;
	const allConnected = lobby.players.every((uid) => {
		const wsAny: any = lobby.connections[uid];
		const socket = wsAny?.socket ?? wsAny;
		return socket && socket.readyState === 1;
	});
	if (!allConnected) return;

	lobby.state = 'running';
	if (lobbyAny.pauseStart && lobbyAny.matchStart) {
		const pausedDuration = Date.now() - lobbyAny.pauseStart;
		lobbyAny.matchStart += pausedDuration;
	}
	lobbyAny.pauseStart = undefined;
	sendToLobby(lobby, { action: 'opponent_reconnected' });
}

function findLobbyByUserId(userId: string): Lobby | undefined {
	for (const lobby of lobbies.values()) {
		if (lobby.players.includes(userId)) {
			return lobby;
		}
	}
	return undefined;
}

function findLobbyByConnection(connection: any): { lobby: Lobby; userId: string } | undefined {
	for (const lobby of lobbies.values()) {
		for (const [uid, conn] of Object.entries(lobby.connections)) {
			const wsAny: any = conn as any;
			const socket = wsAny?.socket ?? wsAny;
			if (socket === (connection as any)) return { lobby, userId: uid };
		}
	}
	return undefined;
}

function startGame(lobby: Lobby) {
	const p1 = lobby.players[0];
	const p2 = lobby.players[1];

	const lobbyAny = lobby as any;
	lobbyAny.fieldWidth = WIDTH;
	lobbyAny.fieldHeight = HEIGHT;

	// Reset ball to center
	lobby.ballPosition = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };

	// Randomize initial direction
	const dirX = randomInt(2) === 0 ? -1 : 1;
	const dirY = randomInt(2) === 0 ? -1 : 1;
	// Slight angle so it's not perfectly vertical/horizontal
	const angle = ((randomInt(40) + 20) * Math.PI) / 180; // 20deg..60deg
	const speed = BALL_SPEED;
	lobby.ballVelocity = {
		vx: Math.cos(angle) * speed * dirX,
		vy: Math.sin(angle) * speed * dirY,
	};

	// Ensure both paddles initialized
	if (lobby.players[0] && lobby.paddlePosition[lobby.players[0]] == null) {
		lobby.paddlePosition[lobby.players[0]] = Math.floor((HEIGHT - PADDLE_HEIGHT) / 2);
	}
	if (lobby.players[1] && lobby.paddlePosition[lobby.players[1]] == null) {
		lobby.paddlePosition[lobby.players[1]] = Math.floor((HEIGHT - PADDLE_HEIGHT) / 2);
	}

	// Initialize match timer on first start
	if (!(lobby as any).matchStart) {
		(lobby as any).matchStart = Date.now();
		(lobby as any).timeRemaining = GAME_DURATION;
	}

	// Initialize key states for continuous movement
	if (!(lobby as any).keyStates) {
		(lobby as any).keyStates = {};
		for (const userId of lobby.players) {
			(lobby as any).keyStates[userId] = { up: false, down: false };
		}
	}
	lobby.state = 'running';
}

function endMatch(lobby: Lobby, winnerId: string) {
	if (lobby.state === 'finished') return;
	lobby.state = 'finished';
	const p1 = lobby.players[0];
	const p2 = lobby.players[1];
	if (!p1 || !p2) return;
	const loserId = winnerId === p1 ? p2 : p1;
	const scoreSnapshot: Record<string, number> = {
		[p1]: lobby.score[p1] ?? 0,
		[p2]: lobby.score[p2] ?? 0,
	};
	try {
		postResults(lobby, {
			matchId:
				lobby.round === 'final' ? lobby.lobbyId.slice(0, -6) : lobby.lobbyId.slice(0, -4),
			winnerId,
			loserId,
			score: scoreSnapshot,
			round: lobby.round,
		});
	} catch (error) {
		console.error('Error posting match result:', error);
	}
	const payload = JSON.stringify({
		action: 'game_over',
		lobbyId: lobby.lobbyId,
		winnerId,
		loserId,
		score: scoreSnapshot,
	});
	for (const userId of lobby.players) {
		try {
			(lobby.connections[userId] as any)?.send?.(payload);
		} catch {}
	}
}

function joinLobby(dataJson: string, connection: any) {
	try {
		const data = JSON.parse(dataJson) as Basic;
		const lobby = lobbies.get(data.lobbyId);
		if (lobby == undefined) {
			lobbies.set(data.lobbyId, {
				lobbyId: data.lobbyId,
				players: [data.userId],
				state: 'waiting',
				ballPosition: { x: 400, y: 300 },
				paddlePosition: { [data.userId]: 250 },
				score: { [data.userId]: 0 },
				connections: { [data.userId]: connection },
				tournament: data.tournament,
				round: data.round,
				players_ready: { [data.userId]: false },
			});
			try {
				(lobbies.get(data.lobbyId)?.connections[data.userId] as any)?.send?.(
					JSON.stringify({ action: 'screen_dimensions', width: WIDTH, height: HEIGHT })
				);
			} catch {}

			//const newLobby = lobbies.get(data.lobbyId);
			//if (newLobby) sendScreenDimensions(newLobby, data.userId);
		} else {
			const lobbyAny = lobby as any;
			if (lobbyAny.disconnectTimers?.[data.userId]) {
				clearTimeout(lobbyAny.disconnectTimers[data.userId]);
				delete lobbyAny.disconnectTimers[data.userId];
			}
			// Prevent more than 2 players in a match lobby
			if (!lobby.players.includes(data.userId) && lobby.players.length >= 2) {
				try {
					(connection as any).send?.(
						JSON.stringify({ action: 'error', message: 'Lobby full' })
					);
				} catch {}
				return;
			}
			if (!lobby.players.includes(data.userId)) {
				lobby.players.push(data.userId);
				lobby.paddlePosition[data.userId] = 250;
				lobby.score[data.userId] = 0;
				lobby.connections[data.userId] = connection;
				lobby.state = 'ready';
				((lobby.tournament = data.tournament),
					(lobby.round = data.round),
					(lobby.players_ready[data.userId] = false));
				try {
					(lobby.connections[data.userId] as any)?.send?.(
						JSON.stringify({
							action: 'screen_dimensions',
							width: WIDTH,
							height: HEIGHT,
						})
					);
				} catch {}
			} else {
				// Reconnect: refresh connection mapping
				lobby.connections[data.userId] = connection;
				resumeLobbyIfReady(lobby);
				try {
					(lobby.connections[data.userId] as any)?.send?.(
						JSON.stringify({
							action: 'screen_dimensions',
							width: WIDTH,
							height: HEIGHT,
						})
					);
				} catch {}
			}
		}
	} catch (e) {
		console.error('Error in joinLobby:', e);
		try {
			(connection as any).send?.(
				JSON.stringify({ action: 'error', message: 'Invalid join data' })
			);
		} catch {}
		return;
	}
}

function movePaddle(dataJson: string, connection: any) {
	let payload: any;
	try {
		payload = JSON.parse(dataJson);
	} catch {
		return;
	}

	const lobbyId: string | undefined = payload.lobbyId;
	const lobby = lobbyId ? lobbies.get(lobbyId) : undefined;

	const targetLobby =
		lobby ??
		(() => {
			for (const L of lobbies.values()) {
				for (const [uid, conn] of Object.entries(L.connections)) {
					const wsAny: any = conn as any;
					const socket = wsAny?.socket ?? wsAny;
					if (socket === (connection as any)) return L;
				}
			}
			return undefined;
		})();

	if (!targetLobby) {
		try {
			(connection as any)?.send?.(
				JSON.stringify({ action: 'error', message: 'Unknown lobby' })
			);
		} catch {}
		return;
	}

	// Resolve userId
	let userId: string | undefined = payload.userId;
	if (!userId) {
		// infer by matching connection
		for (const [uid, conn] of Object.entries(targetLobby.connections)) {
			const wsAny: any = conn as any;
			const socket = wsAny?.socket ?? wsAny;
			if (socket === (connection as any)) {
				userId = uid;
				break;
			}
		}
	}
	if (!userId) return;

	// Get field height from lobby
	const fieldHeight = (targetLobby as any).fieldHeight ?? 600;

	// Initialize paddle position if needed
	if (targetLobby.paddlePosition[userId] == null) {
		targetLobby.paddlePosition[userId] = Math.floor((fieldHeight - PADDLE_HEIGHT) / 2);
	}

	// Initialize key states if not present
	const lobbyAny = targetLobby as any;
	if (!lobbyAny.keyStates) {
		lobbyAny.keyStates = {};
	}
	if (!lobbyAny.keyStates[userId]) {
		lobbyAny.keyStates[userId] = { up: false, down: false };
	}

	// Apply movement - handle both old and new protocol
	if (typeof payload.position === 'number') {
		targetLobby.paddlePosition[userId] = clamp(
			payload.position,
			0,
			fieldHeight - PADDLE_HEIGHT
		);
	} else if (payload.keyState) {
		// New continuous movement protocol
		if (payload.key === 'up') lobbyAny.keyStates[userId].up = payload.keyState === 'down';
		if (payload.key === 'down') lobbyAny.keyStates[userId].down = payload.keyState === 'down';
	} else if (payload.direction === 'up' || payload.direction === 'down') {
		// Legacy single-step movement (mantieni compatibilità)
		const delta = (PADDLE_SPEED * TICK_RATE) / 1000;
		const movement = payload.direction === 'up' ? -delta : delta;
		targetLobby.paddlePosition[userId] = clamp(
			(targetLobby.paddlePosition[userId] ?? 0) + movement,
			0,
			fieldHeight - PADDLE_HEIGHT
		);
	}
}

function leave(dataJson: string, connection: any) {
	try {
		const data = JSON.parse(dataJson) as any;
		const { lobbyId, userId } = data;

		if (!lobbyId || !userId) return;

		const lobby = lobbies.get(lobbyId);
		if (!lobby) return;

		// If game is running, declare the other player as winner
		if (lobby.state === 'running') {
			const p1 = lobby.players[0];
			const p2 = lobby.players[1];
			const otherPlayer = userId === p1 ? p2 : p1;

			if (otherPlayer) {
				// Forfeit - other player wins
				endMatch(lobby, otherPlayer);
			}
		}

		// Remove player from lobby
		lobby.players = lobby.players.filter((p) => p !== userId);
		delete lobby.connections[userId];
		delete lobby.paddlePosition[userId];
		delete lobby.score[userId];

		// If no players left, remove lobby
		if (lobby.players.length === 0) {
			lobbies.delete(lobbyId);
		}
	} catch (e) {
		console.error('Error in leave:', e);
	}
}

function sync(dataJson: string, connection: any) {
	//find lobby based on user,
	//if no lobby send error
	const data = JSON.parse(dataJson) as Basic;
	const lobby = findLobbyByUserId(data.userId);
	if (!lobby) {
		connection.send(
			JSON.stringify({
				action: 'error',
				message: 'Sync error, unknown lobby ID',
			})
		);
	} else {
		const position = lobby.paddlePosition[data.userId];
		connection.send(
			JSON.stringify({
				action: 'sync',
				paddlePosition: position,
			})
		);
	}
}

let broadcastTimer: ReturnType<typeof setInterval> | null = null;

export function broadcast() {
	// Start a periodic broadcast loop exactly once
	if (broadcastTimer) return;

	const intervalMs = TICK_RATE;

	broadcastTimer = setInterval(() => {
		for (const lobby of lobbies.values()) {
			if (lobby.state === 'running') {
				// Update paddle positions based on held keys
				updatePaddles(lobby);
				// Update ball physics per tick when running with 2 players
				updateBall(lobby);

				// Update timer
				const lobbyAny = lobby as any;
				if (lobbyAny.matchStart) {
					const elapsed = Math.floor((Date.now() - lobbyAny.matchStart) / 1000);
					lobbyAny.timeRemaining = Math.max(0, GAME_DURATION - elapsed);

					// Check if time expired
					if (lobbyAny.timeRemaining <= 0 && !lobbyAny.gamePhase) {
						const p1 = lobby.players[0];
						const p2 = lobby.players[1];
						if (p1 && p2) {
							const s1 = lobby.score[p1] ?? 0;
							const s2 = lobby.score[p2] ?? 0;

							if (s1 !== s2) {
								// Someone is winning - end match
								const winner = s1 > s2 ? p1 : p2;
								endMatch(lobby, winner);
								continue;
							} else {
								// Tie - go to overtime
								lobbyAny.gamePhase = 'overtime';
								lobby.score[p1] = 0;
								lobby.score[p2] = 0;
								lobbyAny.timeRemaining = 999; // No time limit
								startGame(lobby);
							}
						}
					}
				}

				const leftUser = lobby.players[0];
				const rightUser = lobby.players[1];
				const fieldHeight = (lobby as any).fieldHeight ?? 600;
				const paddles = {
					left: leftUser
						? (lobby.paddlePosition[leftUser] ??
							Math.floor((fieldHeight - PADDLE_HEIGHT) / 2))
						: Math.floor((fieldHeight - PADDLE_HEIGHT) / 2),
					right: rightUser
						? (lobby.paddlePosition[rightUser] ??
							Math.floor((fieldHeight - PADDLE_HEIGHT) / 2))
						: Math.floor((fieldHeight - PADDLE_HEIGHT) / 2),
				};

				// Prepare scores for both players
				const leftScore = leftUser ? (lobby.score[leftUser] ?? 0) : 0;
				const rightScore = rightUser ? (lobby.score[rightUser] ?? 0) : 0;

				for (const userId of lobby.players) {
					const mySide =
						userId === leftUser ? 'left' : userId === rightUser ? 'right' : undefined;
					const message = JSON.stringify({
						action: 'update',
						ballPosition: lobby.ballPosition,
						paddlePosition: lobby.paddlePosition[userId],
						score: lobby.score[userId],
						paddles,
						leftPaddleY: paddles.left,
						rightPaddleY: paddles.right,
						myPaddle: mySide,
						leftScore,
						rightScore,
						timeRemaining: lobbyAny.timeRemaining ?? GAME_DURATION,
						gamePhase: lobbyAny.gamePhase ?? 'normal',
						serverTime: Date.now(), // Add server timestamp
					});

					const wsAny: any = lobby.connections[userId];
					// Support both Fastify SocketStream and raw ws.WebSocket
					const socket = wsAny?.socket ?? wsAny;

					// 1 === OPEN in ws and WHATWG WebSocket
					if (socket && socket.readyState === 1) {
						try {
							socket.send(message);
						} catch (err) {
							// If send fails, ignore this tick for that socket
						}
					} else {
						// Optionally, clean up closed connections
						delete lobby.connections[userId];
					}
				}
			}
		}
	}, intervalMs);
}

export function stopBroadcast() {
	if (broadcastTimer) {
		clearInterval(broadcastTimer);
		broadcastTimer = null;
	}
}

// --- Helpers and physics ---
function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

function updatePaddles(lobby: Lobby) {
	const lobbyAny = lobby as any;
	if (!lobbyAny.keyStates) return;

	const fieldHeight = lobbyAny.fieldHeight ?? 600;
	const deltaTime = TICK_RATE / 1000; // Convert to seconds
	const movement = PADDLE_SPEED * deltaTime;

	for (const userId of lobby.players) {
		const keys = lobbyAny.keyStates[userId];
		if (!keys) continue;

		let delta = 0;
		if (keys.up && !keys.down) delta = -movement;
		else if (keys.down && !keys.up) delta = movement;

		if (delta !== 0) {
			const currentPos =
				lobby.paddlePosition[userId] ?? Math.floor((fieldHeight - PADDLE_HEIGHT) / 2);
			lobby.paddlePosition[userId] = clamp(
				currentPos + delta,
				0,
				fieldHeight - PADDLE_HEIGHT
			);
		}
	}
}

function updateBall(lobby: Lobby) {
	// Only when running and at least 2 players
	if (lobby.state !== 'running') return;
	if (!lobby.players[0] || !lobby.players[1]) return;

	// Ensure velocity exists
	if (!lobby.ballVelocity) {
		startGame(lobby);
	}
	const v = lobby.ballVelocity!;
	const b = lobby.ballPosition;

	// Get field dimensions from lobby (calculated when game started)
	const fieldWidth = (lobby as any).fieldWidth ?? 800;
	const fieldHeight = (lobby as any).fieldHeight ?? 600;

	// Move
	b.x += v.vx;
	b.y += v.vy;

	// Collide with top/bottom
	if (b.y <= 0) {
		b.y = 0;
		v.vy = Math.abs(v.vy);
	} else if (b.y + BALL_SIZE >= fieldHeight) {
		b.y = fieldHeight - BALL_SIZE;
		v.vy = -Math.abs(v.vy);
	}

	// Paddle positions
	const leftUser = lobby.players[0];
	const rightUser = lobby.players[1];
	const leftY = lobby.paddlePosition[leftUser] ?? Math.floor((fieldHeight - PADDLE_HEIGHT) / 2);
	const rightY = lobby.paddlePosition[rightUser] ?? Math.floor((fieldHeight - PADDLE_HEIGHT) / 2);

	// Left paddle collision
	const leftPaddleRightX = PADDLE_MARGIN + PADDLE_WIDTH; // 24 + 12 = 36
	if (b.x <= leftPaddleRightX && b.x + BALL_SIZE >= PADDLE_MARGIN) {
		const ballCenterY = b.y + BALL_SIZE / 2;
		if (ballCenterY >= leftY && ballCenterY <= leftY + PADDLE_HEIGHT) {
			// bounce to the right with angle based on hit position
			const relative = (ballCenterY - (leftY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
			const angle = relative * ((60 * Math.PI) / 180); // up to 60 degrees
			const speed = Math.hypot(v.vx, v.vy) || BALL_SPEED;
			v.vx = Math.cos(angle) * speed; // to right
			v.vy = Math.sin(angle) * speed;
			// place ball just outside paddle
			b.x = leftPaddleRightX;
		}
	}

	// Right paddle collision
	const rightPaddleLeftX = fieldWidth - PADDLE_MARGIN - PADDLE_WIDTH;
	if (b.x + BALL_SIZE >= rightPaddleLeftX && b.x <= rightPaddleLeftX + PADDLE_WIDTH) {
		const ballCenterY = b.y + BALL_SIZE / 2;
		if (ballCenterY >= rightY && ballCenterY <= rightY + PADDLE_HEIGHT) {
			const relative = (ballCenterY - (rightY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
			const angle = relative * ((60 * Math.PI) / 180);
			const speed = Math.hypot(v.vx, v.vy) || BALL_SPEED;
			v.vx = -Math.cos(angle) * speed; // to left
			v.vy = Math.sin(angle) * speed;
			b.x = rightPaddleLeftX - BALL_SIZE;
		}
	}

	// Scoring: ball leaves left/right bounds
	if (b.x + BALL_SIZE < 0) {
		// Right player scores
		if (rightUser) lobby.score[rightUser] = (lobby.score[rightUser] ?? 0) + 1;
		// Check win condition before restarting next rally
		if (checkWin(lobby)) return; // match ended
		startGame(lobby);
	} else if (b.x > fieldWidth) {
		// Left player scores
		if (leftUser) lobby.score[leftUser] = (lobby.score[leftUser] ?? 0) + 1;
		if (checkWin(lobby)) return; // match ended
		startGame(lobby);
	}
}

function postResults(lobby: Lobby, payload: any) {
	if (lobby.tournament) {
		console.log('Posting tournament match result:', payload);
		fetch(createApiUrl('/api/tournament-match-result'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload),
		}).catch((err) => console.error('Error sending tournament result:', err));
	} else {
		console.log('Posting match result:', payload);
		fetch(createApiUrl('/api/match-result'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				matchId: lobby.lobbyId,
				winnerId: payload.winnerId,
				loserId: payload.loserId,
			}),
		}).catch((err) => console.error('Error sending match result:', err));
	}
}

function checkWin(lobby: Lobby): boolean {
	const p1 = lobby.players[0];
	const p2 = lobby.players[1];
	if (!p1 || !p2) return false;
	const s1 = lobby.score[p1] ?? 0;
	const s2 = lobby.score[p2] ?? 0;
	const lobbyAny = lobby as any;
	const isOvertime = lobbyAny.gamePhase === 'overtime';
	const winningScore = isOvertime ? WIN_SCORE_OVERTIME : WIN_SCORE;

	if (s1 >= winningScore || s2 >= winningScore) {
		const hasTwoPointLead = Math.abs(s1 - s2) >= 2;
		if ((isOvertime && hasTwoPointLead) || (!isOvertime && hasTwoPointLead)) {
			const payload = {
				matchId: lobby.lobbyId,
				winnerId: s1 > s2 ? p1 : p2,
				loserId: s1 > s2 ? p2 : p1,
				score: {
					[s1 > s2 ? p1 : p2]: Math.max(s1, s2),
					[s1 > s2 ? p2 : p1]: Math.min(s1, s2),
				},
				round: lobby.round,
			};
			console.log(`Match ${lobby.lobbyId} ended. Scores: ${p1}=${s1}, ${p2}=${s2}`);
			const winner = s1 > s2 ? p1 : p2;
			endMatch(lobby, winner!);
			return true;
		}
	}
	return false;
}

function handlePause(dataJson: string, connection: any) {
	console.log('Received pause toggle request');
	let data: any;
	try {
		data = JSON.parse(dataJson);
	} catch {
		return;
	}
	const userId = data?.userId as string | undefined;
	const lobbyId = data?.lobbyId as string | undefined;

	const lobby =
		(userId ? findLobbyByUserId(userId) : undefined) ??
		(lobbyId ? lobbies.get(lobbyId) : undefined) ??
		(() => {
			for (const L of lobbies.values()) {
				for (const conn of Object.values(L.connections)) {
					const wsAny: any = conn as any;
					const socket = wsAny?.socket ?? wsAny;
					if (socket === (connection as any)) return L;
				}
			}
			return undefined;
		})();
	if (!lobby) return;
	const lobbyAny = lobby as any;
	if (lobby.state === 'running') {
		lobby.state = 'paused';
		lobbyAny.pauseStart = Date.now();
	} else if (lobby.state === 'paused') {
		lobby.state = 'running';
		if (lobbyAny.pauseStart && lobbyAny.matchStart) {
			const pausedDuration = Date.now() - lobbyAny.pauseStart;
			lobbyAny.matchStart += pausedDuration;
		}
		lobbyAny.pauseStart = undefined;
	}
}

function startDisconnectGrace(lobby: Lobby, userId: string) {
	const lobbyAny = lobby as any;
	if (lobby.state === 'running') {
		lobby.state = 'paused';
		if (!lobbyAny.pauseStart) lobbyAny.pauseStart = Date.now();
	}
	if (!lobbyAny.disconnectTimers) lobbyAny.disconnectTimers = {};
	if (lobbyAny.disconnectTimers[userId]) {
		clearTimeout(lobbyAny.disconnectTimers[userId]);
	}
	sendToLobby(lobby, { action: 'opponent_disconnected', userId });
	sendToLobby(lobby, { action: 'pause', reason: 'opponent_disconnected' });
	lobbyAny.disconnectTimers[userId] = setTimeout(() => {
		const currentLobby = findLobbyByUserId(userId);
		if (!currentLobby || currentLobby.state === 'finished') return;
		const p1 = currentLobby.players[0];
		const p2 = currentLobby.players[1];
		const otherPlayer = userId === p1 ? p2 : p1;
		if (otherPlayer) {
			endMatch(currentLobby, otherPlayer);
		}
	}, 10000);
}

function setReady(dataJson: string, connection: any) {
	let data: any;
	try {
		data = JSON.parse(dataJson);
	} catch {
		console.log('Failed to parse setready data');
		return;
	}
	const userId = data.userId;
	const lobbyId = data.lobbyId;
	const lobby = lobbyId ? lobbies.get(lobbyId) : undefined;
	if (!lobby) return;
	lobby.players_ready[userId] = true;
	try {
		(connection as any)?.send?.(JSON.stringify({ action: 'ready_ok' }));
	} catch {
		console.error('Failed to send ready ok');
	}
	// Check if all players are ready
	const allReady = lobby.players.every((uid) => lobby.players_ready[uid]);
	if (allReady) {
		for (const uid of lobby.players) {
			try {
				(lobby.connections[uid] as any)?.send?.(
					JSON.stringify({ action: 'opponent_ready' })
				);
			} catch {
				console.error('Failed to send opponent ready');
			}
		}
		startGame(lobby);
	}
}

export async function Game(server: FastifyInstance) {
	server.get('/connect', { websocket: true } as any, (connection: any, req: any) => {
		const wsAny: any = connection as any;
		const socket = wsAny?.socket ?? wsAny;
		let lastPong = Date.now();
		let userIdForHeartbeat: string | undefined;
		const heartbeatTimer = setInterval(() => {
			if (!socket) return;
			const now = Date.now();
			if (now - lastPong > 45000) {
				const info = findLobbyByConnection(connection);
				const targetUserId = userIdForHeartbeat ?? info?.userId;
				const targetLobby = info?.lobby;
				if (targetLobby && targetUserId) {
					startDisconnectGrace(targetLobby, targetUserId);
				}
				try {
					socket.close?.(4000, 'ping timeout');
				} catch {}
				clearInterval(heartbeatTimer);
				return;
			}
			try {
				socket?.send?.(JSON.stringify({ action: 'ping' }));
			} catch {}
		}, 15000);

		connection.on('message', async (message: any) => {
			try {
				const raw = message.toString();
				const data = JSON.parse(raw);
				switch (data.action) {
					case 'join':
						userIdForHeartbeat = data.userId;
						joinLobby(message, connection);
						break;
					case 'movePaddle':
						movePaddle(message, connection);
						break;
					case 'leave':
						leave(message, connection);
						break;
					case 'sync':
						sync(message, connection);
						break;
					case 'pause':
						handlePause(message, connection);
						break;
					case 'ping':
						lastPong = Date.now();
						try {
							socket?.send?.(JSON.stringify({ action: 'pong' }));
						} catch {}
						break;
					case 'startGame':
						setReady(message, connection);
						break;
					default:
						break;
				}
			} catch (error) {
				console.error('WebSocket message error:', error);
			}
		});
		connection.on('close', () => {
			const info = findLobbyByConnection(connection);
			console.log(
				'WebSocket closed for user:',
				info?.userId,
				'in lobby:',
				info?.lobby.lobbyId
			);
			if (info) startDisconnectGrace(info.lobby, info.userId);
			clearInterval(heartbeatTimer);
		});
	});
}
