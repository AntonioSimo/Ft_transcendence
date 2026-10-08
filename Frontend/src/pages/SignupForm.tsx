import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupAPI } from '../utils/api/signup';
import { GoBackButton } from '../components/chat/GoBackButton';
import type { SignupError } from '../utils/api/signup';

type SignupFormProps = {
	onSuccess?: () => void;
};

export function SignupForm({ onSuccess }: SignupFormProps) {
	const [nickname, setNickname] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const navigate = useNavigate();

	const handleSignup = async () => {
		setError('');
		setSuccess('');

		const validationError = signupAPI.validateSignupFields(nickname, email, password);
		if (validationError) {
			setError(validationError);
			return;
		}

		try {
			await signupAPI.signup({ nickname, email, password });
			setSuccess('Sign Up successful! Redirecting to login...');
			setTimeout(() => {
				navigate('/auth');
				onSuccess?.();
			}, 1500);
		} catch (err) {
			const signupError = err as SignupError;
			setError(signupError.message);
		}
	};

	const handleGoogleLogin = () => {
		window.location.href = signupAPI.getGoogleAuthUrl();
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-6">
			<div className="absolute top-6 left-8">
				<GoBackButton />
			</div>
			<h1 className="text-3xl font-bold text-white">Sign Up</h1>

			<div className="flex flex-col gap-4 w-80">
				{error && <div className="text-red-400 font-semibold text-center p-2">{error}</div>}
				{success && (
					<div className="text-green-400 font-semibold text-center p-2">{success}</div>
				)}

				<input
					type="text"
					placeholder="Nickname"
					value={nickname}
					onChange={(e) => setNickname(e.target.value)}
					className="px-4 py-2 rounded bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300"
				/>

				<input
					type="email"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="px-4 py-2 rounded bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300"
				/>

				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="px-4 py-2 rounded bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300"
				/>

				<button
					onClick={handleSignup}
					className="block px-6 py-4 rounded-lg text-black bg-white hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105"
				>
					Create Account
				</button>

				<div className="text-center text-white my-2 font-semibold">or</div>

				<button
					onClick={handleGoogleLogin}
					className="block px-6 py-4 rounded-lg text-black bg-white hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105"
				>
					Sign up with Google
				</button>
			</div>
		</div>
	);
}
