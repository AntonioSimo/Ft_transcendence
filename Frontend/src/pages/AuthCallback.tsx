import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';

export function AuthCallback() {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const handleCallback = () => {
			try {
				const errorParam = searchParams.get('error');
				const user = searchParams.get('user');

				if (errorParam) {
					console.error('[AuthCallback] OAuth error:', errorParam);
					setError(`Google login failed: ${errorParam}`);
					return;
				}
				if (user) {
					const userData = JSON.parse(decodeURIComponent(user));

					localStorage.setItem('nickname', userData.nickname);
					localStorage.setItem('is2FAVerified', 'true');

					const from = (location.state as any)?.from?.pathname || '/home';
					navigate(from, { replace: true });
				} else {
					console.error('[AuthCallback] No user data received');
					setError('Google login was cancelled or failed. No user data received.');
				}
			} catch (e) {
				console.error('[AuthCallback] Exception:', e);
				setError('An error occurred while processing the login.');
			}
		};
		handleCallback();
	}, [navigate, searchParams, location]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-black text-center p-4">
			{error ? (
				<>
					<div className="text-red-500 text-2xl font-bold">Authentication Error</div>
					<div className="mt-4 text-red-400 font-semibold">{error}</div>
					<Link
						to="/"
						className="mt-8 px-6 py-2 rounded-lg text-black bg-white hover:bg-yellow-300 transition duration-200"
					>
						Go back to Login
					</Link>
				</>
			) : (
				<>
					<div className="text-white text-xl">Processing Google login...</div>
					<div className="mt-4 text-gray-400">
						Please wait while we complete your authentication.
					</div>
				</>
			)}
		</div>
	);
}
