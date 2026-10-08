import { FastifyInstance } from 'fastify';
import * as users from '../../db_functionalities/usersTableFunctions';
import * as group from '../../db_functionalities/groupsTableFunctions';
import * as messages from '../../db_functionalities/messagesTableFunctions';

const activeConnections = new Map<string, any>();
const globalConnections = new Map<string, any>();
const offlineTimers = new Map<string, NodeJS.Timeout>();

export function broadcastChallengeMessage(userNickname: string, messageData: any) {
	const globalConnection = globalConnections.get(userNickname);
	if (globalConnection) {
		try {
			globalConnection.send(JSON.stringify(messageData));
			return true;
		} catch (error) {
			console.error(`Error broadcasting via global socket to ${userNickname}:`, error);
			globalConnections.delete(userNickname);
		}
	}
	const chatConnection = activeConnections.get(userNickname);
	if (chatConnection) {
		try {
			chatConnection.send(JSON.stringify(messageData));
			return true;
		} catch (error) {
			console.error(`Error broadcasting via chat socket to ${userNickname}:`, error);
			activeConnections.delete(userNickname);
			return false;
		}
	}

	return false;
}

export async function chat(fastify: FastifyInstance) {
	fastify.get('/api/loadchat', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		const friendNickname = request.headers['friend-user'] as string;
		if (!nickname || !friendNickname) {
			return reply
				.status(400)
				.send({ message: 'Both curr-user and friend-user headers are required' });
		}
		try {
			const groupData = await group.findDirectMessageGroup(nickname, friendNickname);
			if (!groupData) {
				return reply
					.status(404)
					.send({ message: 'No chat found between users - they may not be friends yet' });
			}

			const chatMessages = await messages.getMessagesByGroupId(groupData.id);
			return reply.status(200).send({
				groupId: groupData.id,
				messages: chatMessages,
			});
		} catch (error) {
			console.error('Error loading chat:', error);
			return reply.status(500).send({ message: 'Internal server error' });
		}
	});
	fastify.get('/api/check-if-last-message-read', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		const friendNickname = request.headers['friend-user'] as string;
		const messageId = request.headers['message-id'] as string;

		if (!nickname || !friendNickname || !messageId) {
			return reply.send({
				message: 'curr-user, friend-user, and message-id headers are required',
			});
		}
		try {
			const groupData = await group.findDirectMessageGroup(nickname, friendNickname);
			if (!groupData) {
				return reply.send({ isRead: false });
			}
			const message = await messages.getMessagesByGroupId(groupData.id);
			if (!message || message.length === 0) {
				return reply.send({ message: 'Message not found' });
			}
			console.log('Checking if message is read:', { nickname, friendNickname, messageId });
			const user_id = await users.getUserByNickname(nickname).then((user) => user?.id);
			if (!user_id) {
				return reply.send({ message: 'User not found' });
			}
			const isRead = await messages.checkIfMessageIsRead(messageId, user_id);
			return reply.send({ isRead });
		} catch (error) {
			console.error('Error checking if message is read:', error);
			return reply.send({ message: 'Internal server error' });
		}
	});

	fastify.post('/api/mark-chat-read', async (request, reply) => {
		const nickname = request.headers['curr-user'] as string;
		const friendNickname = (request.body as any).friendNickname;

		if (!nickname || !friendNickname) {
			return reply.status(400).send({ message: 'curr-user and friendNickname are required' });
		}

		try {
			await users.updateLastLoginTime(nickname, new Date());
			return reply.status(200).send({ ok: true });
		} catch (error) {
			console.error('Error marking chat as read:', error);
			return reply.status(500).send({ message: 'Internal server error' });
		}
	});

	fastify.post('/api/send-message', async (request, reply) => {
		const { from, to, message, type, matchId, challengeId, challengeStatus } =
			request.body as any;

		if (!from || !to || !message) {
			return reply.status(400).send({ message: 'from, to, and message are required' });
		}

		try {
			const groupData = await group.findDirectMessageGroup(from, to);
			if (!groupData) {
				return reply.status(404).send({ message: 'No chat found - users are not friends' });
			}
			const savedMessage = await messages.createMessage({
				message: message,
				sender_Nickname: from,
				groupId: groupData.id,
				type: type || 'chat_message',
				matchId: matchId,
				challengeId: challengeId,
				challengeStatus:
					challengeStatus || (type === 'challenge_message' ? 'pending' : undefined),
			});

			const messageToSend = {
				type: type || 'chat_message',
				id: savedMessage.id,
				from: from,
				to: to,
				message: message,
				timestamp: savedMessage.created_at.getTime(),
				groupId: groupData.id,
				matchId: matchId,
				challengeId,
				challengeStatus:
					challengeStatus || (type === 'challenge_message' ? 'pending' : undefined),
			};
			const recipientChatConnection = activeConnections.get(to);
			if (recipientChatConnection) {
				try {
					recipientChatConnection.send(JSON.stringify(messageToSend));
				} catch (error) {
					console.error(`Error sending to recipient chat ${to}:`, error);
					activeConnections.delete(to);
				}
			}

			const globalRecipientConnection = globalConnections.get(to);

			if (type === 'tournament_cancelled') {
				if (globalRecipientConnection) {
					try {
						globalRecipientConnection.send(
							JSON.stringify({
								type: 'tournament_cancelled',
								from: from,
								to: to,
								message: message,
								timestamp: messageToSend.timestamp,
								matchId: matchId,
							})
						);
					} catch (error) {
						console.error(
							`Error sending tournament cancelled notification to ${to}:`,
							error
						);
						globalConnections.delete(to);
					}
				}
			} else if (globalRecipientConnection && !recipientChatConnection) {
				try {
					globalRecipientConnection.send(
						JSON.stringify({
							type: type || 'message_notification',
							messageType: type || 'message_notification',
							from: from,
							to: to,
							message: message,
							timestamp: messageToSend.timestamp,
							groupId: messageToSend.groupId,
							matchId: matchId,
							challengeId,
							challengeStatus:
								challengeStatus ||
								(type === 'challenge_message' ? 'pending' : undefined),
						})
					);
				} catch (error) {
					console.error(`Error sending global notification to ${to}:`, error);
					globalConnections.delete(to);
				}
			}

			return reply.status(200).send({ ok: true, message: savedMessage });
		} catch (error) {
			console.error('Error sending message:', error);
			return reply.status(500).send({ message: 'Internal server error' });
		}
	});

	fastify.get('/global', { websocket: true }, (connection, req) => {
		let currentUser: string | null = null;

		connection.on('message', async (message: any) => {
			try {
				const data = JSON.parse(message.toString());
				switch (data.type) {
					case 'connect_user':
						currentUser = data.currentUser;
						if (currentUser) {
							if (offlineTimers.has(currentUser)) {
								clearTimeout(offlineTimers.get(currentUser)!);
								offlineTimers.delete(currentUser);
							}
							globalConnections.set(currentUser, connection);
							await users.updateUserOnlineStatus(currentUser, true);
							try {
								const user = await users.getUserByNickname(currentUser);
								if (user) {
									const allGroups = await group.getAllGroups();

									for (const grp of allGroups) {
										const groupWithUsers = await group.getGroupUsersById(
											grp.id
										);
										if (!groupWithUsers) continue;
										const isParticipant = groupWithUsers.Users.some(
											(u) => u.id === user.id
										);
										if (!isParticipant) continue;
										const groupMessages = await messages.getMessagesByGroupId(
											grp.id
										);
										const unreadMessages = groupMessages.filter(
											(msg) =>
												new Date(msg.created_at) >
													new Date(user.last_loginTime) &&
												msg.sender_Nickname !== currentUser
										);

										const recentUnread = unreadMessages.slice(-5);
										for (const msg of recentUnread) {
											connection.send(
												JSON.stringify({
													type: 'message_notification',
													from: msg.sender_Nickname,
													to: currentUser,
													message: msg.message,
													timestamp: new Date(msg.created_at).getTime(),
												})
											);
										}
									}
								}
							} catch (error) {
								console.error('Error checking unread messages:', error);
							}
						}
						connection.send(
							JSON.stringify({
								type: 'connected',
								user: currentUser,
								message: 'Connected to global socket',
							})
						);
						break;
					case 'ping':
						connection.send(JSON.stringify({ type: 'pong' }));
						break;
					case 'message_notification':
						break;
				}
			} catch (error) {
				console.error('Global WebSocket message error:', error);
			}
		});

		connection.on('close', async () => {
			if (currentUser) {
				globalConnections.delete(currentUser);
				const timer = setTimeout(async () => {
					await users.updateUserOnlineStatus(currentUser!, false);
					offlineTimers.delete(currentUser!);
				}, 5000);

				offlineTimers.set(currentUser, timer);
			}
		});
	});

	fastify.get('/chat', { websocket: true }, (connection, req) => {
		let currentUser: string | null = null;
		connection.on('message', async (message: any) => {
			try {
				const data = JSON.parse(message.toString());
				switch (data.type) {
					case 'join_chat':
						currentUser =
							data.currentUser || (data.participants && data.participants[0]);
						if (currentUser) {
							activeConnections.set(currentUser, connection);
						}
						connection.send(
							JSON.stringify({
								type: 'joined_chat',
								user: currentUser,
								message: 'Successfully joined chat',
							})
						);
						break;
					case 'ping':
						connection.send(JSON.stringify({ type: 'pong' }));
						break;
					case 'chat_message':
						try {
							const groupData = await group.findDirectMessageGroup(
								data.from,
								data.to
							);
							if (!groupData) {
								connection.send(
									JSON.stringify({
										type: 'error',
										message: 'Cannot send message - users are not friends',
									})
								);
								break;
							}
							const savedMessage = await messages.createMessage({
								message: data.message,
								sender_Nickname: data.from,
								groupId: groupData.id,
								type: 'chat_message',
							});
							const messageToSend = {
								type: 'chat_message',
								id: savedMessage.id,
								from: data.from,
								to: data.to,
								message: data.message,
								timestamp: savedMessage.created_at.getTime(),
								groupId: groupData.id,
							};
							connection.send(JSON.stringify(messageToSend));
							const recipientConnection = activeConnections.get(data.to);
							if (recipientConnection && recipientConnection !== connection) {
								try {
									recipientConnection.send(JSON.stringify(messageToSend));
								} catch (error) {
									console.error(`Error sending to recipient ${data.to}:`, error);
									activeConnections.delete(data.to);
								}
							}
							const globalRecipientConnection = globalConnections.get(data.to);
							if (globalRecipientConnection && !recipientConnection) {
								try {
									globalRecipientConnection.send(
										JSON.stringify({
											type: 'message_notification',
											from: data.from,
											to: data.to,
											message: data.message,
											timestamp: messageToSend.timestamp,
											groupId: messageToSend.groupId,
										})
									);
								} catch (error) {
									console.error(
										`Error sending global notification to ${data.to}:`,
										error
									);
									globalConnections.delete(data.to);
								}
							}
						} catch (dbError) {
							console.error('Database error:', dbError);
							connection.send(
								JSON.stringify({
									type: 'error',
									message: 'Failed to save message',
								})
							);
						}
						break;
					case 'challenge_message': {
						try {
							const groupData = await group.findDirectMessageGroup(
								data.from,
								data.to
							);
							if (!groupData) {
								connection.send(
									JSON.stringify({
										type: 'error',
										message: 'Cannot send challenge - users are not friends',
									})
								);
								break;
							}

							const savedMessage = await messages.createMessage({
								message: data.message,
								sender_Nickname: data.from,
								groupId: groupData.id,
								type: 'challenge_message',
								matchId: data.matchId,
								challengeId: data.challengeId || data.matchId,
								challengeStatus: data.challengeStatus || 'pending',
							});

							const messageToSend = {
								type: 'challenge_message',
								id: data.challengeId || savedMessage.id,
								from: data.from,
								to: data.to,
								message: data.message,
								timestamp: savedMessage.created_at.getTime(),
								groupId: groupData.id,
								matchId: data.matchId,
								challengeId: data.challengeId || savedMessage.id,
								challengeStatus: data.challengeStatus || 'pending',
							};

							// Echo back to sender so UI updates with the persisted id
							connection.send(JSON.stringify(messageToSend));

							const recipientConnection = activeConnections.get(data.to);
							if (recipientConnection && recipientConnection !== connection) {
								try {
									recipientConnection.send(JSON.stringify(messageToSend));
								} catch (error) {
									console.error(
										`Error sending challenge to recipient ${data.to}:`,
										error
									);
									activeConnections.delete(data.to);
								}
							}

							const globalRecipientConnection = globalConnections.get(data.to);
							if (globalRecipientConnection && !recipientConnection) {
								try {
									globalRecipientConnection.send(
										JSON.stringify({
											type: 'challenge_message',
											messageType: 'challenge_message',
											from: data.from,
											to: data.to,
											message: data.message,
											timestamp: messageToSend.timestamp,
											groupId: messageToSend.groupId,
											matchId: data.matchId,
											challengeId: messageToSend.challengeId,
											challengeStatus: messageToSend.challengeStatus,
										})
									);
								} catch (error) {
									console.error(
										`Error sending global challenge notification to ${data.to}:`,
										error
									);
									globalConnections.delete(data.to);
								}
							}
						} catch (dbError) {
							console.error('Database error (challenge_message):', dbError);
							connection.send(
								JSON.stringify({
									type: 'error',
									message: 'Failed to save challenge message',
								})
							);
						}
						break;
					}
				}
			} catch (error) {
				console.error('WebSocket message error:', error);
			}
		});
		connection.on('close', async () => {
			if (currentUser) {
				activeConnections.delete(currentUser);
			}
		});
	});
}
