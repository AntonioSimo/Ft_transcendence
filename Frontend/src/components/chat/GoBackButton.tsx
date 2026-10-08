import { useNavigate } from 'react-router-dom';

export function GoBackButton() {
	const navigate = useNavigate();

	return (
		<button
			onClick={() => navigate(-1)}
			className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-300 text-black text-lg font-bold hover:bg-yellow-400 transition-colors"
			title="Go back"
		>
			&lt;
		</button>
	);
}
