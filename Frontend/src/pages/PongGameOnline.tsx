import { useState, useEffect, useRef, type ReactElement, use, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { lobbyAPI } from '../utils/api';

type Vector2 = { x: number; y: number };
type GamePhase = 'normal' | 'overtime';

type AnyMsg = {
	action?: string;
	myPaddle?: 'left' | 'right';
	ballPosition?: Vector2;
	paddles?: { left: number; right: number };
	leftScore?: number;
	rightScore?: number;
	gamePhase?: GamePhase;
	timeRemaining?: number;
	gameEnded?: boolean;
	winner?: string;
	width?: number;
	height?: number;
	serverTime?: number; // Server timestamp
};

function OnlinePongGame(): ReactElement {
	// --------------------------
	// game states
	// --------------------------
	const [myPaddle, setMyPaddle] = useState<'left' | 'right' | null>(null);
	const [gameState, setGameState] = useState<'pre-game' | 'playing'>('pre-game');
	const [isColliding, setIsColliding] = useState<boolean>(false);
	const [leftScore, setLeftScore] = useState<number>(0);
	const [rightScore, setRightScore] = useState<number>(0);
	const [ballColor, setBallColor] = useState<string>('#fff');
	const [showExitConfirmation, setShowExitConfirmation] = useState<boolean>(false);
	const [gamePhase, setGamePhase] = useState<GamePhase>('normal');
	const [timeRemaining, setTimeRemaining] = useState<number>(120);
	const [gameEnded, setGameEnded] = useState<boolean>(false);
	const [winner, setWinner] = useState<string | null>(null);
	const [gameResult, setGameResult] = useState<{ winnerId: string; loserId: string } | null>(
		null
	);
	const [serverWidth, setServerWidth] = useState<number>(1800);
	const [serverHeight, setServerHeight] = useState<number>(1600);
	const [clientWidth, setClientWidth] = useState<number>(
		typeof window !== 'undefined' ? window.innerWidth : 800
	);
	const [clientHeight, setClientHeight] = useState<number>(
		typeof window !== 'undefined' ? window.innerHeight : 600
	);
	const [opponent_disconnected, setOpponentDisconnected] = useState<boolean>(false);
	const [opponentNotReady, setOpponentNotReady] = useState<boolean>(false);
	const [isAllowedToConnect, setIsAllowedToConnect] = useState<boolean | null>(null);

	// --------------------------
	// INTERPOLATION STATE
	// --------------------------
	const [interpolatedLeftPaddleY, setInterpolatedLeftPaddleY] = useState<number>(250);
	const [interpolatedRightPaddleY, setInterpolatedRightPaddleY] = useState<number>(250);
	const [interpolatedBallPosition, setInterpolatedBallPosition] = useState<Vector2>({
		x: 400,
		y: 300,
	});
	const [cancelAlert, setCancelAlert] = useState<string | null>(null);

	// Track previous values for interpolation (start point)
	const prevLeftPaddleRef = useRef<number>(250);
	const prevRightPaddleRef = useRef<number>(250);
	const prevBallPosRef = useRef<Vector2>({ x: 400, y: 300 });

	// Track current target values from server (end point)
	const currLeftPaddleRef = useRef<number>(250);
	const currRightPaddleRef = useRef<number>(250);
	const currBallPosRef = useRef<Vector2>({ x: 400, y: 300 });

	// Track last rendered values (what's actually displayed)
	const lastRenderedLeftPaddleRef = useRef<number>(250);
	const lastRenderedRightPaddleRef = useRef<number>(250);
	const lastRenderedBallPosRef = useRef<Vector2>({ x: 400, y: 300 });

	// Track update timestamps for interpolation factor calculation
	const lastUpdateTimeRef = useRef<number>(Date.now());
	const lastServerTimeRef = useRef<number>(0); // Track actual server timestamp
	const actualUpdateIntervalRef = useRef<number>(16); // Track actual time between server updates

	// Track if this is the first update (to avoid interpolating from wrong initial position)
	const isFirstUpdateRef = useRef<boolean>(true);

	const [params] = useSearchParams();
	const location = useLocation();
	const matchId = params.get('matchId') || 'test';
	const lobbyId = params.get('lobbyId') || matchId; // prefer lobbyId (tournament), fallback to matchId for 1v1
	const isTournament = params.get('tournament') === 'true';
	const round = params.get('round'); // 'sf1' or 'sf2' for tournament matches

	const WINNING_SCORE_NORMAL = 11;
	const WINNING_SCORE_OVERTIME = 2;
	const GAME_DURATION = 120;

	const GAME_Z_INDEX = 1000;
	const PRIMARY_COLOR = '#FBBF24';

	const PADDLE_HEIGHT = 128;
	const PADDLE_WIDTH = 12;
	const BALL_SIZE = 20;
	const PADDLE_MARGIN = 24;

	// Animation frame tracking for interpolation
	const animationFrameRef = useRef<number | null>(null);

	// DOM refs for direct manipulation (bypass React state for smoother rendering)
	const ballElementRef = useRef<HTMLDivElement | null>(null);
	const leftPaddleElementRef = useRef<HTMLDivElement | null>(null);
	const rightPaddleElementRef = useRef<HTMLDivElement | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const matchResultSentRef = useRef<boolean>(false);
	const lastPongRef = useRef<number>(Date.now());
	const heartbeatTimerRef = useRef<number | null>(null);
	const reconnectTimerRef = useRef<number | null>(null);
	const reconnectAttemptsRef = useRef<number>(0);
	const isManuallyClosedRef = useRef<boolean>(false);
	const pausedForDisconnectRef = useRef<boolean>(false);
	const navigate = useNavigate();

	const handledMatchCancelledRef = useRef<boolean>(false); // To prevent multiple handling of the same cancellation

	// --------------------------
	// INTERPOLATION UTILITY FUNCTIONS
	// --------------------------
	const interpolate = (prev: number, curr: number, factor: number): number => {
		// Allow slight extrapolation (up to 1.3x) for paddles
		const clampedFactor = Math.max(0, Math.min(factor, 1.3));
		return prev + (curr - prev) * clampedFactor;
	};

	const interpolateBall = (prev: number, curr: number, factor: number): number => {
		// Higher extrapolation limit for ball (up to 1.5x) for smoother fast movement
		const clampedFactor = Math.max(0, Math.min(factor, 1.5));
		return prev + (curr - prev) * clampedFactor;
	};

	// --------------------------
	// UTILITY
	// --------------------------
	const clickHandler = () => setShowExitConfirmation(true);
	const handleConfirmExit = () => {
		// Notify server about leaving
		const ws = wsRef.current;
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(
				JSON.stringify({
					action: 'leave',
					lobbyId: lobbyId,
					userId: localStorage.getItem('nickname') || 'anonymous',
				})
			);
			ws.close();
		}
		navigate('/home');
	};
	const handleCancelExit = () => setShowExitConfirmation(false);

	const formatTime = (seconds: number): string => {
		if (gamePhase === 'overtime') return 'OVERTIME';
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	};

	const handleMatchCancelledData = useCallback(
		(detail: any) => {
			if (!detail) detail = {};
			if (handledMatchCancelledRef.current) return;

			if (detail.matchId && matchId && detail.matchId !== matchId) return;

			handledMatchCancelledRef.current = true;

			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.close(1000, 'Match cancelled');
			}
			const msg = detail.message || 'Match was cancelled. Returning to home...';
			setCancelAlert(msg);
			try {
				localStorage.setItem('global_cancel_alert', msg);
			} catch {}
			setTimeout(() => navigate('/home'), 1500);
		},
		[matchId, navigate]
	);

	useEffect(() => {
		handledMatchCancelledRef.current = false;
	}, [matchId]);

	useEffect(() => {
		const handleMatchCancelled = (event: Event) =>
			handleMatchCancelledData((event as CustomEvent).detail || {});

		const matchCancelledQueue = (window as any).__matchCancelledQueue as any[] | undefined;
		if (matchCancelledQueue && matchCancelledQueue.length) {
			matchCancelledQueue.forEach(handleMatchCancelledData);
			matchCancelledQueue.length = 0;
		}

		window.addEventListener('global:match_cancelled', handleMatchCancelled as EventListener);
		return () =>
			window.removeEventListener(
				'global:match_cancelled',
				handleMatchCancelled as EventListener
			);
	}, [handleMatchCancelledData]);

	useEffect(() => {
		if (!cancelAlert) return;
		const timer = setTimeout(() => setCancelAlert(null), 5000);
		return () => clearTimeout(timer);
	}, [cancelAlert]);

	// --------------------------
	// STILI GLOABLI
	// --------------------------
	useEffect(() => {
		const styleId = 'pong-game-styles';
		if (document.getElementById(styleId)) return;

		const resetStyles = `
      body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      #root { margin: 0 !important; padding: 0 !important; max-width: unset !important; }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
        50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
      }
    `;

		const styleSheet = document.createElement('style');
		styleSheet.id = styleId;
		styleSheet.textContent = resetStyles;
		document.head.appendChild(styleSheet);

		return () => {
			const styleElement = document.getElementById(styleId);
			if (styleElement) document.head.removeChild(styleElement);
		};
	}, []);

	// --------------------------
	// ANIMATION LOOP FOR INTERPOLATION
	// --------------------------
	useEffect(() => {
		const animationLoop = (timestamp: number) => {
			const now = Date.now();
			const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
			// Use actual measured interval instead of assuming 16ms
			const interpolationFactor =
				timeSinceLastUpdate > actualUpdateIntervalRef.current * 2
					? 1
					: timeSinceLastUpdate / actualUpdateIntervalRef.current;

			// Interpolate paddle positions (allows extrapolation up to 1.3x for smoothness)
			const newLeftPaddle = interpolate(
				prevLeftPaddleRef.current,
				currLeftPaddleRef.current,
				interpolationFactor
			);
			const newRightPaddle = interpolate(
				prevRightPaddleRef.current,
				currRightPaddleRef.current,
				interpolationFactor
			);

			// Interpolate ball position with higher extrapolation for smoother movement
			const newBallPos: Vector2 = {
				x: interpolateBall(
					prevBallPosRef.current.x,
					currBallPosRef.current.x,
					interpolationFactor
				),
				y: interpolateBall(
					prevBallPosRef.current.y,
					currBallPosRef.current.y,
					interpolationFactor
				),
			};

			// Store what we're rendering for next interpolation start point
			lastRenderedLeftPaddleRef.current = newLeftPaddle;
			lastRenderedRightPaddleRef.current = newRightPaddle;
			lastRenderedBallPosRef.current = newBallPos;

			// Direct DOM manipulation for 60+ FPS smooth rendering (bypasses React reconciliation)
			const scaleX = serverWidth ? clientWidth / serverWidth : 1;
			const scaleY = serverHeight ? clientHeight / serverHeight : 1;
			const uniformScale = Math.min(scaleX, scaleY);
			const paddleScale = Math.min(uniformScale, 1.2);

			if (leftPaddleElementRef.current) {
				leftPaddleElementRef.current.style.transform = `translateY(${newLeftPaddle * scaleY}px)`;
			}
			if (rightPaddleElementRef.current) {
				rightPaddleElementRef.current.style.transform = `translateY(${newRightPaddle * scaleY}px)`;
			}
			if (ballElementRef.current) {
				ballElementRef.current.style.transform = `translate(${newBallPos.x * scaleX}px, ${newBallPos.y * scaleY}px)`;
			}

			// Still update React state for other components that might need these values
			setInterpolatedLeftPaddleY(newLeftPaddle);
			setInterpolatedRightPaddleY(newRightPaddle);
			setInterpolatedBallPosition(newBallPos);

			animationFrameRef.current = requestAnimationFrame(animationLoop);
		};

		animationFrameRef.current = requestAnimationFrame(animationLoop);

		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [serverWidth, serverHeight, clientWidth, clientHeight]);

	useEffect(() => {
		const updateSize = () => {
			setClientWidth(window.innerWidth);
			setClientHeight(window.innerHeight);
		};
		updateSize();
		window.addEventListener('resize', updateSize);
		return () => window.removeEventListener('resize', updateSize);
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) return;
			e.preventDefault();

			const ws = wsRef.current;
			if (!ws || ws.readyState !== WebSocket.OPEN || !myPaddle) return;

			let key: 'up' | 'down';
			if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') key = 'up';
			else key = 'down';

			ws.send(
				JSON.stringify({
					action: 'movePaddle',
					key,
					keyState: 'down',
					myPaddle,
				})
			);
		};

		const onKeyUp = (e: KeyboardEvent) => {
			if (!['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) return;
			e.preventDefault();

			const ws = wsRef.current;
			if (!ws || ws.readyState !== WebSocket.OPEN || !myPaddle) return;

			let key: 'up' | 'down';
			if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') key = 'up';
			else key = 'down';

			ws.send(
				JSON.stringify({
					action: 'movePaddle',
					key,
					keyState: 'up',
					myPaddle,
				})
			);
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	}, [myPaddle]);

	useEffect(() => {
		let cancelled = false;
		const nickname = localStorage.getItem('nickname');
		if (!matchId) {
			setIsAllowedToConnect(true);
			return;
		}
		if (!nickname) {
			navigate('/auth');
			return;
		}

		const verifyAccess = async () => {
			let lobbyIdtocheck = lobbyId || 'test';
			try {
				if (isTournament) {
					if (round == 'sf1' || round == 'sf2')
						lobbyIdtocheck = lobbyIdtocheck.slice(0, -4);
					else if (round == 'final') lobbyIdtocheck = lobbyIdtocheck.slice(0, -6);
				}
				const matchInfo = await lobbyAPI.getGameInfo(matchId);
				if (cancelled) return;

				const participants = (matchInfo?.participants || []).map((p: any) => p.nickname);
				const isParticipant = participants.includes(nickname);
				const isPending = matchInfo?.status === 'PENDING' || matchInfo?.status === 'ACTIVE';


				if (
					matchId === 'test' ||
					!isParticipant ||
					!isPending ||
					lobbyIdtocheck != matchId
				) {
					const msg = !isParticipant
						? 'You are not a participant in this match.'
						: 'Match is no longer pending.';
					setCancelAlert(msg);
					try {
						localStorage.setItem('global_cancel_alert', msg);
					} catch {}
					navigate('/home');
					return;
				}

				setIsAllowedToConnect(true);
			} catch (error) {
				if (cancelled) return;
				const msg = 'Unable to validate match access.';
				setCancelAlert(msg);
				try {
					localStorage.setItem('global_cancel_alert', msg);
				} catch {}
				navigate('/home');
			}
		};

		verifyAccess();

		return () => {
			cancelled = true;
		};
	}, [matchId, navigate]);

	useEffect(() => {
		if (isAllowedToConnect !== true) return;
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const defaultUrl = `${protocol}://${window.location.hostname}:4000/connect`;
		const envUrl = (import.meta as any)?.env?.VITE_GAME_WS_URL as string | undefined;
		const WS_URL = envUrl || defaultUrl;

		const clearHeartbeat = () => {
			if (heartbeatTimerRef.current !== null) {
				window.clearInterval(heartbeatTimerRef.current);
				heartbeatTimerRef.current = null;
			}
		};

		const scheduleReconnect = () => {
			if (reconnectTimerRef.current !== null || isManuallyClosedRef.current) return;
			const attempt = reconnectAttemptsRef.current + 1;
			reconnectAttemptsRef.current = attempt;
			const delay = Math.min(10000, 500 * Math.pow(2, attempt));
			reconnectTimerRef.current = window.setTimeout(() => {
				reconnectTimerRef.current = null;
				connect();
			}, delay);
		};

		const connect = () => {
			try {
				const ws = new WebSocket(WS_URL);
				wsRef.current = ws;

				ws.onopen = () => {
					isManuallyClosedRef.current = false;
					reconnectAttemptsRef.current = 0;
					lastPongRef.current = Date.now();
					clearHeartbeat();
					heartbeatTimerRef.current = window.setInterval(() => {
						if (ws.readyState === WebSocket.OPEN) {
							ws.send(JSON.stringify({ action: 'ping' }));
						}
						if (Date.now() - lastPongRef.current > 30000) {
							try {
								ws.close();
							} catch {}
						}
					}, 10000);

					const targetLobby = lobbyId || matchId || 'default';
					ws.send(
						JSON.stringify({
							action: 'join',
							lobbyId: targetLobby,
							userId: localStorage.getItem('nickname') || 'anonymous',
							round: round,
							tournament: isTournament,
						})
					);
				};

				ws.onmessage = (ev) => {
					if (typeof ev.data === 'string' && ev.data === 'pong') {
						lastPongRef.current = Date.now();
						return;
					}

					let data: AnyMsg | AnyMsg[] | undefined;
					try {
						data = JSON.parse(ev.data);
					} catch {
						return;
					}

					const msgs = Array.isArray(data) ? data : [data];
					for (const msg of msgs) {
						if (msg?.action === 'pong') {
							lastPongRef.current = Date.now();
							continue;
						}
						if (msg) {
							const now = Date.now();
							const timeSinceUpdate = now - lastUpdateTimeRef.current;
							const shouldSnap =
								timeSinceUpdate > actualUpdateIntervalRef.current * 3;

							if (msg.action === 'game_over') {
								const myUserId = localStorage.getItem('nickname') || 'anonymous';
								const winnerId = (msg as any).winnerId;
								const loserId = (msg as any).loserId;
								const amIWinner = winnerId === myUserId;

								setGameResult({ winnerId, loserId });
								setWinner(amIWinner ? 'YOU WIN!' : 'YOU LOST');
								setGameEnded(true);
								setGameState('paused');
								matchResultSentRef.current = true;
								continue;
							}
							if (msg.action === 'screen_dimensions') {
								if (typeof msg.width === 'number') setServerWidth(msg.width);
								if (typeof msg.height === 'number') setServerHeight(msg.height);
							}

							if (msg.myPaddle) setMyPaddle(msg.myPaddle);

							// Calculate actual server update interval from timestamps
							if (msg.serverTime && lastServerTimeRef.current > 0) {
								const actualInterval = msg.serverTime - lastServerTimeRef.current;
								// Smooth the interval measurement to avoid jitter from single outliers
								actualUpdateIntervalRef.current =
									actualUpdateIntervalRef.current * 0.8 + actualInterval * 0.2;
							}
							if (msg.serverTime) {
								lastServerTimeRef.current = msg.serverTime;
							}

							// Track if we need to reset the timer (only once per message)
							let shouldResetTimer = false;

							// Update interpolation previous values when new state arrives
							if (msg.ballPosition) {
								// On first update, initialize all refs to server position (no interpolation)
								if (isFirstUpdateRef.current || shouldSnap) {
									prevBallPosRef.current = msg.ballPosition;
									currBallPosRef.current = msg.ballPosition;
									lastRenderedBallPosRef.current = msg.ballPosition;
								} else {
									// Calculate where we are RIGHT NOW in the current interpolation
									const currentFactor = Math.max(
										0,
										Math.min(
											timeSinceUpdate / actualUpdateIntervalRef.current,
											1
										)
									);

									// Calculate current interpolated position
									const currentX =
										prevBallPosRef.current.x +
										(currBallPosRef.current.x - prevBallPosRef.current.x) *
											currentFactor;
									const currentY =
										prevBallPosRef.current.y +
										(currBallPosRef.current.y - prevBallPosRef.current.y) *
											currentFactor;

									// Use current position as new starting point
									prevBallPosRef.current = { x: currentX, y: currentY };
									// Set new server position as target
									currBallPosRef.current = msg.ballPosition;
								}
								shouldResetTimer = true;
							}

							if (msg.paddles) {
								// On first update, initialize all refs to server positions
								if (isFirstUpdateRef.current || shouldSnap) {
									prevLeftPaddleRef.current = msg.paddles.left;
									currLeftPaddleRef.current = msg.paddles.left;
									lastRenderedLeftPaddleRef.current = msg.paddles.left;
									prevRightPaddleRef.current = msg.paddles.right;
									currRightPaddleRef.current = msg.paddles.right;
									lastRenderedRightPaddleRef.current = msg.paddles.right;
								} else {
									// Calculate where we are RIGHT NOW in the current interpolation
									const currentFactor = Math.max(
										0,
										Math.min(
											timeSinceUpdate / actualUpdateIntervalRef.current,
											1
										)
									);

									// Calculate current interpolated positions
									const currentLeft =
										prevLeftPaddleRef.current +
										(currLeftPaddleRef.current - prevLeftPaddleRef.current) *
											currentFactor;
									const currentRight =
										prevRightPaddleRef.current +
										(currRightPaddleRef.current - prevRightPaddleRef.current) *
											currentFactor;

									// Use current positions as new starting points
									prevLeftPaddleRef.current = currentLeft;
									prevRightPaddleRef.current = currentRight;
									// Set new server positions as targets
									currLeftPaddleRef.current = msg.paddles.left;
									currRightPaddleRef.current = msg.paddles.right;
								}
								shouldResetTimer = true;
							}

							// Only reset timer once per message to avoid restarting interpolation mid-frame
							if (shouldResetTimer) {
								lastUpdateTimeRef.current = Date.now();
								isFirstUpdateRef.current = false; // Mark that we've received first update
								if (shouldSnap) {
									actualUpdateIntervalRef.current = 16;
								}
							}

							if (msg.leftScore !== undefined) setLeftScore(msg.leftScore);
							if (msg.rightScore !== undefined) setRightScore(msg.rightScore);
							if (msg.gamePhase) setGamePhase(msg.gamePhase);
							if (msg.timeRemaining !== undefined)
								setTimeRemaining(msg.timeRemaining);
							if (msg.gameEnded !== undefined) setGameEnded(msg.gameEnded);
							if (msg.winner) setWinner(msg.winner);
							if (msg.action === 'opponent_disconnected')
								setOpponentDisconnected(true);
							if (msg.action === 'opponent_reconnected')
								setOpponentDisconnected(false);
							if (msg.action === 'ready_ok') setOpponentNotReady(true);
							if (msg.action === 'opponent_ready') setOpponentNotReady(false);
						}
					}
				};

				ws.onclose = () => {
					clearHeartbeat();
					scheduleReconnect();
				};

				ws.onerror = (err) => {
					console.error('[WS] Error:', err);
				};
			} catch (e) {
				console.error('[WS] Failed to connect', e);
				scheduleReconnect();
			}
		};
		connect();

		return () => {
			isManuallyClosedRef.current = true;
			if (reconnectTimerRef.current !== null) {
				window.clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
			clearHeartbeat();
			wsRef.current?.close();
			wsRef.current = null;
		};
	}, [isAllowedToConnect, isTournament, lobbyId, matchId, round]);

	function startGame() {
		const ws = wsRef.current;
		if (ws && ws.readyState === WebSocket.OPEN) {
			const payload = {
				action: 'startGame',
				lobbyId,
				userId: localStorage.getItem('nickname') || 'anonymous',
			};
			try {
				ws.send(JSON.stringify(payload));
				setGameState('playing');
			} catch (error) {
				console.error('Error sending startGame:', error);
			}
		}
	}

	// --------------------------
	// SCALE FACTORS FOR RENDERING (SERVER -> CLIENT SPACE)
	// --------------------------
	const scaleX = serverWidth ? clientWidth / serverWidth : 1;
	const scaleY = serverHeight ? clientHeight / serverHeight : 1;
	const uniformScale = Math.min(scaleX, scaleY); // uniform scale to prevent giant paddles on wide screens
	const paddleScale = Math.min(uniformScale, 1.2); // cap paddle scale to max 1.2x

	const scaledLeftPaddleY = interpolatedLeftPaddleY * scaleY;
	const scaledRightPaddleY = interpolatedRightPaddleY * scaleY;
	const scaledLeft = PADDLE_MARGIN * scaleX;
	const scaledRight = PADDLE_MARGIN * scaleX;
	const scaledPaddleWidth = PADDLE_WIDTH * paddleScale; // use capped scale to keep paddles reasonable
	const scaledPaddleHeight = PADDLE_HEIGHT * paddleScale; // use capped scale for consistent sizing
	const scaledBallX = interpolatedBallPosition.x * scaleX;
	const scaledBallY = interpolatedBallPosition.y * scaleY;
	const scaledBallSize = BALL_SIZE * uniformScale;
	return (
		<div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden">
			{/* Pre-game overlay */}
			{gameState === 'pre-game' && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[3000]">
					<div className="bg-[#222] p-10 rounded-[10px] border-2 border-yellow-400 text-center text-white flex flex-col gap-5">
						<h2 className="text-[2rem] m-0 text-yellow-400">GAME CONTROLS</h2>
						<p>
							Your Paddle: <strong>{myPaddle ?? '...'}</strong>
						</p>
						<p>Use ↑ / ↓ or W/S to move. Space to pause.</p>
						<button
							onClick={startGame}
							className="mt-5 px-8 py-4 text-[1.3rem] text-black bg-yellow-400 rounded-lg cursor-pointer font-bold"
						>
							START GAME
						</button>
					</div>
				</div>
			)}

			{/* Timer Display */}
			<div
				className={`absolute top-5 left-1/2 -translate-x-1/2 text-[1.5rem] font-bold z-[1000] bg-black/70 px-5 py-2.5 rounded-lg border-2 ${
					gamePhase === 'overtime'
						? 'text-red-400 border-red-400 animate-[pulse_1.5s_infinite] drop-shadow-[0_0_10px_#ff4444]'
						: 'text-yellow-400 border-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
				}`}
			>
				{formatTime(timeRemaining)}
			</div>

			<div className="absolute top-[88px] left-1/2 -translate-x-1/2 w-1/4 flex justify-between text-[1.875rem] tracking-[0.1em] z-[1000]">
				<span className="text-yellow-400">{leftScore.toString().padStart(2, '0')}</span>
				<span className="text-yellow-400">{rightScore.toString().padStart(2, '0')}</span>
			</div>

			{/* Opponent not ready banner */}
			{opponentNotReady && !gameEnded && (
				<div className="absolute top-[140px] left-1/2 -translate-x-1/2 z-[3200]">
					<div className="bg-blue-500/90 border-2 border-blue-200 text-white px-[22px] py-[14px] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center min-w-[320px]">
						<div className="text-[1.15rem] font-bold tracking-[0.03em]">
							Waiting for opponent
						</div>
						<div className="mt-1.5 text-[0.95rem] text-sky-100">
							They must ready up before the match starts
						</div>
					</div>
				</div>
			)}

			{/* Opponent disconnected banner */}
			{opponent_disconnected && !gameEnded && (
				<div className="absolute top-[140px] left-1/2 -translate-x-1/2 z-[3200]">
					<div className="bg-red-500/90 border-2 border-rose-200 text-white px-[22px] py-[14px] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-center min-w-[320px]">
						<div className="text-[1.15rem] font-bold tracking-[0.03em]">
							Opponent disconnected
						</div>
						<div className="mt-1.5 text-[0.95rem] text-rose-100">
							Waiting for them to reconnect...
						</div>
					</div>
				</div>
			)}

			{/* Paddle sinistro - Hardware accelerated with CSS transforms */}
			<div
				ref={leftPaddleElementRef}
				className="absolute top-0 rounded-[2px] shadow-[0_0_10px_rgba(255,255,255,0.6)] will-change-transform"
				style={{
					left: `${scaledLeft}px`,
					width: `${scaledPaddleWidth}px`,
					height: `${scaledPaddleHeight}px`,
					backgroundColor: isColliding ? '#0000ff' : '#fff',
					transform: `translateY(${scaledLeftPaddleY}px)`,
				}}
			/>

			{/* Paddle destro - Hardware accelerated with CSS transforms */}
			<div
				ref={rightPaddleElementRef}
				className="absolute top-0 rounded-[2px] shadow-[0_0_10px_rgba(255,255,255,0.6)] will-change-transform"
				style={{
					right: `${scaledRight}px`,
					width: `${scaledPaddleWidth}px`,
					height: `${scaledPaddleHeight}px`,
					backgroundColor: isColliding ? '#ff0000' : '#fff',
					transform: `translateY(${scaledRightPaddleY}px)`,
				}}
			/>

			{/* Palla - Hardware accelerated with CSS transforms */}
			<div
				ref={ballElementRef}
				className="absolute left-0 top-0 rounded-full will-change-transform"
				style={{
					width: `${scaledBallSize}px`,
					height: `${scaledBallSize}px`,
					backgroundColor: ballColor,
					boxShadow: `0 0 15px ${ballColor}80`,
					transform: `translate(${scaledBallX}px, ${scaledBallY}px)`,
				}}
			/>

			{/* Center line */}
			<div
				className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2"
				style={{
					backgroundImage:
						'repeating-linear-gradient(to bottom, #444, #444 15px, transparent 15px, transparent 30px)',
				}}
			/>

			{/* Exit confirmation */}
			{showExitConfirmation && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[3100]">
					<div className="bg-[#222] p-10 rounded-xl border-[3px] border-yellow-400 text-center text-white flex flex-col items-center gap-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[400px]">
						<h2 className="text-[2rem] m-0 text-yellow-400">LEAVE GAME?</h2>
						<p className="m-0 text-[#ccc]">You will forfeit this match</p>
						<div className="flex gap-5 mt-2.5">
							<button
								onClick={handleConfirmExit}
								className="px-8 py-4 text-[1.2rem] text-white bg-red-600 border-2 border-red-600 rounded-lg cursor-pointer font-bold shadow-[0_4px_8px_rgba(0,0,0,0.3)] min-w-[100px]"
							>
								YES
							</button>
							<button
								onClick={handleCancelExit}
								className="px-8 py-4 text-[1.2rem] text-black bg-yellow-400 border-2 border-yellow-400 rounded-lg cursor-pointer font-bold shadow-[0_4px_8px_rgba(0,0,0,0.3)] min-w-[100px]"
							>
								NO
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Pulsantiera BACK */}
			<button
				onClick={clickHandler}
				className="absolute top-5 left-5 z-[2000] text-white bg-black/70 border-2 border-yellow-400 px-4 py-2 rounded-lg cursor-pointer text-sm font-bold"
			>
				BACK TO MENU
			</button>

			{/* Game Over Overlay */}
			{gameEnded && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/90 z-[3000]">
					<div className="bg-[#222] p-12 rounded-[15px] border-[3px] border-yellow-400 text-center text-white flex flex-col items-center gap-8 min-w-[500px]">
						<h2 className="text-[3rem] m-0 text-yellow-400">GAME OVER!</h2>
						<h3
							className={`text-[2rem] m-0 ${winner?.includes('Left') ? 'text-emerald-400' : 'text-orange-500'}`}
						>
							{winner}
						</h3>
						<div className="text-[1.5rem] text-[#ccc]">
							Final Score: {leftScore} - {rightScore}
						</div>
						<div className="flex gap-5">
							<button
								onClick={() => {
									if (isTournament && matchId) {
										navigate(
											`/tournament-bracket?matchId=${encodeURIComponent(matchId)}`,
											{
												state: {
													tournamentId: matchId,
													isTournament: true,
												},
											}
										);
									} else {
										navigate('/home');
									}
								}}
								className="px-8 py-4 text-[1.2rem] text-white bg-red-500 rounded-lg cursor-pointer font-bold"
							>
								BACK TO {isTournament ? 'BRACKET' : 'MENU'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default OnlinePongGame;
