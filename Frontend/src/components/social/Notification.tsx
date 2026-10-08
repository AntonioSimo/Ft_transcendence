type NotificationProps = {
	type: 'success' | 'error';
	message: string;
};

export function Notification({ type, message }: NotificationProps) {
	return (
		<div
			className={`fixed top-4 right-4 px-6 py-3 rounded shadow-lg z-50 ${
				type === 'success' ? 'bg-green-600' : 'bg-red-600'
			}`}
		>
			{message}
		</div>
	);
}
