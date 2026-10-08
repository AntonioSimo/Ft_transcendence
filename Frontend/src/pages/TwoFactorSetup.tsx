import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { twoFactorAPI } from '../utils/api/twoFactor';
import type { TwoFactorError } from '../utils/api/twoFactor';
import { authAPI } from '../utils/api';

export default function TwoFactorSetup({ onVerified }: { onVerified: () => void }) {
	const [qrCodeUrl, setQrCodeUrl] = useState(() => sessionStorage.getItem('qrCodeUrl') || '');
	const [token, setToken] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	useEffect(() => {
		if (qrCodeUrl) return;
		const fetchSetup = async () => {
			try {
				const nickname = localStorage.getItem('nickname');
				const data = await twoFactorAPI.setup(nickname);
				if (data.qrCodeUrl) {
					setQrCodeUrl(data.qrCodeUrl);
					sessionStorage.setItem('qrCodeUrl', data.qrCodeUrl);
				}
			} catch (err) {
				const twoFactorError = err as TwoFactorError;
				setError(twoFactorError.message);
			}
		};

		fetchSetup();
	}, [qrCodeUrl]);

	const handleLogout = async () => {
		const nickname = localStorage.getItem('nickname');
		if (!nickname) {
			navigate('/auth');
			return;
		}

		try {
			await authAPI.logout(nickname);
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			localStorage.removeItem('nickname');
			localStorage.removeItem('is2FAVerified');
			navigate('/auth');
		}
	};

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		try {
			const nickname = localStorage.getItem('nickname') || '';
			const result = await twoFactorAPI.verify({ token, nickname });

			if (result.verified) {
				localStorage.setItem('is2FAVerified', 'true');
				sessionStorage.removeItem('qrCodeUrl');
				localStorage.setItem('checkedMessages', 'false');
				navigate('/home');
				onVerified();
			} else {
				setError('Invalid code');
			}
		} catch (err) {
			const twoFactorError = err as TwoFactorError;
			setError(twoFactorError.message);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-black">
			<h2 className="text-4xl font-bold text-white mb-4">Two-Factor Authentication</h2>
			<button
				onClick={handleLogout}
				className="absolute top-6 left-8 flex items-center justify-center px-6 py-2 rounded-full bg-yellow-300 text-black text-sm font-bold hover:bg-yellow-400 transition-colors"
			>
				&lt;
			</button>
			<div className="flex flex-col items-center gap-4 w-80 bg-gray-900 p-8 rounded-lg shadow-lg">
				{qrCodeUrl && (
					<img
						src={qrCodeUrl}
						alt="QR Code"
						className="mx-auto mb-4 w-48 h-48 bg-white p-2 rounded"
					/>
				)}
				<form onSubmit={handleVerify} className="flex flex-col gap-4 w-full">
					<input
						type="text"
						placeholder="Enter the code from Google Authenticator"
						value={token}
						onChange={(e) => setToken(e.target.value)}
						className="px-4 py-2 rounded bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-yellow-300"
						required
					/>
					<button
						type="submit"
						className="block px-6 py-4 rounded-lg text-black bg-white hover:bg-yellow-300 hover:text-black transition duration-200 shadow-md hover:shadow-black hover:scale-105"
					>
						SEND
					</button>
				</form>
				{error && <div className="text-red-400 font-semibold">{error}</div>}
			</div>
		</div>
	);
}
