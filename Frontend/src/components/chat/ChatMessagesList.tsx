import { useRef, useEffect } from 'react';
import { ChallengeMessage } from '../game/ChallengeMessage';
import { TournamentInviteMessage } from '../tournament/TournamentInviteMessage';

interface ChatMessagesListProps {
	activeChat: string | null;
	chatMessages: any[];
	currentUser: string;
	onOpenProfile: (username: string) => void;
	onUpdateChallengeStatus?: (messageId: string, status: string) => void;
	onUpdateInviteStatus?: (messageId: string, status: string) => void;
}

export function ChatMessagesList({
	activeChat,
	chatMessages,
	currentUser,
	onOpenProfile,
	onUpdateChallengeStatus,
	onUpdateInviteStatus,
}: ChatMessagesListProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [chatMessages]);

	useEffect(() => {
		if (activeChat) {
			setTimeout(scrollToBottom, 100);
		}
	}, [activeChat]);

	if (!activeChat) {
		return (
			<div
				ref={messagesContainerRef}
				className="flex-grow overflow-y-auto mb-4 border border-gray-700 p-3 rounded"
			>
				<p className="text-gray-400 text-center">Select a friend to start chatting</p>
			</div>
		);
	}

	return (
		<div
			ref={messagesContainerRef}
			className="flex-grow overflow-y-auto mb-4 border border-gray-700 p-3 rounded"
		>
			<div className="space-y-3">
				<div className="text-center text-gray-400 mb-2">Chat with {activeChat}</div>

				<div className="space-y-2">
					{chatMessages.length > 0 ? (
						chatMessages.map((message: any, index: number) => (
							<div key={`${message.id || index}-${index}`} className="px-0">
								{(() => {
									const isChallenge =
										message.type === 'challenge_message' ||
										message.messageType === 'challenge_message';
									const challengeStatus = message.challengeStatus || 'pending';
									const isPendingChallenge =
										isChallenge && challengeStatus === 'pending';
									const isResolvedChallenge =
										isChallenge && challengeStatus !== 'pending';

									const isTournamentInvite =
										message.type === 'tournament_invite' ||
										message.messageType === 'tournament_invite';
									const inviteStatus = message.inviteStatus || 'pending';
									const isPendingInvite =
										isTournamentInvite && inviteStatus === 'pending';
									const isResolvedInvite =
										isTournamentInvite && inviteStatus !== 'pending';

									if (isPendingChallenge) {
										return (
											<ChallengeMessage
												message={message}
												currentUser={currentUser}
												onStatusChange={(status) =>
													onUpdateChallengeStatus?.(
														message.id || message.challengeId,
														status
													)
												}
											/>
										);
									}

									if (isResolvedChallenge) {
										const isMine = message.from === currentUser;
										const bubbleClass = isMine
											? 'bg-blue-600 ml-auto text-right'
											: 'bg-gray-700 mr-auto text-left';
										const label =
											challengeStatus === 'accepted'
												? 'Challenge accepted'
												: 'Challenge declined';
										return (
											<div
												className={`p-2 rounded max-w-[70%] ${bubbleClass}`}
											>
												{message.from !== currentUser && (
													<div className="mb-1">
														<button
															onClick={() =>
																onOpenProfile(message.from)
															}
															className="text-sm text-yellow-300 hover:underline"
														>
															{message.from}
														</button>
													</div>
												)}
												<p className="text-sm font-semibold">{label}</p>
												<p className="text-xs text-gray-300 mt-1">
													{message.timestamp
														? new Date(
																message.timestamp
															).toLocaleTimeString()
														: ''}
												</p>
											</div>
										);
									}

									if (isPendingInvite) {
										return (
											<TournamentInviteMessage
												message={message}
												currentUser={currentUser}
												onStatusChange={(status) =>
													onUpdateInviteStatus?.(
														message.id || message.matchId,
														status
													)
												}
											/>
										);
									}

									if (isResolvedInvite) {
										const isMine = message.from === currentUser;
										const bubbleClass = isMine
											? 'bg-blue-600 ml-auto text-right'
											: 'bg-gray-700 mr-auto text-left';
										const label =
											inviteStatus === 'accepted'
												? 'Tournament invite accepted'
												: inviteStatus === 'cancelled'
													? 'Tournament cancelled'
													: 'Tournament invite declined';
										return (
											<div
												className={`p-2 rounded max-w-[70%] ${bubbleClass}`}
											>
												{message.from !== currentUser && (
													<div className="mb-1">
														<button
															onClick={() =>
																onOpenProfile(message.from)
															}
															className="text-sm text-yellow-300 hover:underline"
														>
															{message.from}
														</button>
													</div>
												)}
												<p className="text-sm font-semibold">{label}</p>
												<p className="text-xs text-gray-300 mt-1">
													{message.timestamp
														? new Date(
																message.timestamp
															).toLocaleTimeString()
														: ''}
												</p>
											</div>
										);
									}

									return (
										<div
											className={`p-2 rounded max-w-[70%] ${
												message.from === currentUser
													? 'bg-blue-600 ml-auto text-right'
													: 'bg-gray-700 mr-auto text-left'
											}`}
										>
											{message.from !== currentUser && (
												<div className="mb-1">
													<button
														onClick={() => onOpenProfile(message.from)}
														className="text-sm text-yellow-300 hover:underline"
													>
														{message.from}
													</button>
												</div>
											)}
											<p className="text-sm">{message.message}</p>
											<p className="text-xs text-gray-300 mt-1">
												{message.timestamp
													? new Date(
															message.timestamp
														).toLocaleTimeString()
													: ''}
											</p>
										</div>
									);
								})()}
							</div>
						))
					) : (
						<p className="text-gray-500 text-center text-sm">
							No messages yet. Start the conversation!
						</p>
					)}
					<div ref={messagesEndRef} />
				</div>
			</div>
		</div>
	);
}
