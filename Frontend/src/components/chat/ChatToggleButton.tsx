import { useChat } from './ChatContext';

export function ChatToggleButton() {
	// let islogout = false;
	const { toggleChat, notification } = useChat();

	return (
		<div className="fixed bottom-6 right-6 z-[1100]">
			<button
				onClick={toggleChat}
				className="relative bg-yellow-400 text-black px-4 py-3 rounded-full shadow-lg hover:bg-yellow-500 transition"
			>
				{notification && (
					<span className="absolute -top-1 -right-1 flex h-3 w-3">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
						<span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
					</span>
				)}
			</button>
		</div>
	);
}
