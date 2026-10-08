import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../utils/api';

export function AuthPage() {
	const [emailNickname, setEmailNickname] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const errorEffectRan = useRef(false);
	useEffect(() => {
		if (errorEffectRan.current) return;
		errorEffectRan.current = true;

		const errorParam = searchParams.get('error');
		if (errorParam) {
			setError(`Authentication error: ${errorParam}`);
		}
	}, [searchParams]);

	const handleLogin = async () => {
		setError('');
		if (!emailNickname || !password) {
			setError('Please enter email or nickname and password');
			return;
		}

		try {
			const data = await authAPI.login(emailNickname, password);
			if (!data || !data.user) {
				setError('User does not exist');
				return;
			}

			localStorage.setItem('nickname', data.user.nickname);
			localStorage.setItem('is2FAVerified', 'false');

			navigate('/2fa');
		} catch (error: any) {
			const message = error.response?.data.message;
			if (message === 'Invalid credentials' || message === 'Invalid password')
				setError('Invalid credentials, please try again');
			else setError('Login failed. Please try again.');
		}
	};

	const handleSignup = () => {
		navigate('/signup');
	};

	const handleGoogleLogin = () => {
		window.location.href = authAPI.getGoogleAuthUrl();
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-black">
			<h1 className="text-6xl font-bold text-white">TRANSCENDENCE</h1>

			<div className="flex flex-col gap-4 w-80">
				{error && <div className="text-red-400 font-semibold text-center">{error}</div>}

				<input
					type="text"
					placeholder="Email or nickname"
					value={emailNickname}
					onChange={(e) => setEmailNickname(e.target.value)}
					className="px-4 py-2 rounded bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300"
				/>

				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
					className="px-4 py-2 rounded bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300"
				/>

				<div className="flex justify-between gap-4">
					<button
						onClick={handleLogin}
						className="block px-6 py-4 rounded-lg text-black bg-white hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105"
					>
						Log In
					</button>
					<button
						onClick={handleSignup}
						className="block px-6 py-4 rounded-lg text-black bg-white hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105"
					>
						Sign Up
					</button>
				</div>

				<div className="text-center text-white my-2 font-semibold">or</div>

				<button
					onClick={handleGoogleLogin}
					className="block px-6 py-4 rounded-lg text-black bg-white hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105"
				>
					Log in with Google
				</button>
			</div>
		</div>
	);
}
