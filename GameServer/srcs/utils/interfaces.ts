export interface Lobby {
	lobbyId: string;
	players: string[];
	state: string;
	ballPosition: { x: number; y: number };
	ballVelocity?: { vx: number; vy: number };
	paddlePosition: { [userId: string]: number };
	score: { [userId: string]: number };
	connections: { [userId: string]: any };
	tournament: boolean;
	round: string;
	players_ready: { [userId: string]: boolean };
}

export interface Basic {
	action: string;
	lobbyId: string;
	userId: string;
	tournament: boolean;
	round: string;
	isTournament: boolean;
}
