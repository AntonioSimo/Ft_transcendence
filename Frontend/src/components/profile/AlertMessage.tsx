interface AlertMessageProps {
	type: 'error' | 'success';
	message: string;
	onClose: () => void;
}

export function AlertMessage({ type, message, onClose }: AlertMessageProps) {
	const isError = type === 'error';

	return (
		<div
			className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
				isError
					? 'bg-red-900/50 border border-red-500'
					: 'bg-green-900/50 border border-green-500'
			}`}
		>
			<div className="flex items-center">
				<svg
					className={`w-5 h-5 mr-2 ${isError ? 'text-red-400' : 'text-green-400'}`}
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					{isError ? (
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					) : (
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clipRule="evenodd"
						/>
					)}
				</svg>
				<span className={`text-sm ${isError ? 'text-red-300' : 'text-green-300'}`}>
					{message}
				</span>
			</div>
			<button
				onClick={onClose}
				className={`ml-4 ${isError ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
			>
				✕
			</button>
		</div>
	);
}
