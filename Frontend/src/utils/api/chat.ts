import axios from 'axios';
import { createApiUrl } from '../../config/api';

export const chatAPI = {
	async loadChatHistory(currentUser: string, friendUsername: string) {
		const response = await fetch(createApiUrl('/api/loadchat'), {
			headers: {
				'curr-user': currentUser,
				'friend-user': friendUsername,
			},
			credentials: 'include',
		});

		if (!response.ok) {
			throw new Error('Failed to load chat history');
		}

		const data = await response.json();
		return data.messages;
	},

	async markChatAsRead(currentUser: string, friendNickname: string) {
		const response = await fetch(createApiUrl('/api/mark-chat-read'), {
			method: 'POST',
			headers: {
				'curr-user': currentUser,
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({ friendNickname }),
		});

		if (!response.ok) {
			throw new Error('Failed to mark chat as read');
		}

		return response.json();
	},

	async sendChatMessage(from: string, to: string, message: string) {
		return axios.post(
			createApiUrl('/api/send-message'),
			{ from, to, message, type: 'chat_message' },
			{ withCredentials: true }
		);
	},
	async checkIfMessageIsRead(nickname: string, friendNickname: string, messageId: string) {
		try {
			const response = await fetch(createApiUrl('/api/check-if-last-message-read'), {
				headers: {
					'curr-user': nickname,
					'friend-user': friendNickname,
					'message-id': messageId,
				},
				credentials: 'include',
			});

			if (!response.ok) {
				return false;
			}

			const data = await response.json();
			return data.isRead;
		} catch (error) {
			console.error('Error checking if message is read:', error);
			return false;
		}
	},
};
