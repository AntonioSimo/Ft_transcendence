import { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import { createApiUrl } from '../config/api';

interface ProtectedRouteProps {
	children?: React.ReactNode;
}

interface AuthResponse {
	loggedIn: boolean;
}

export const clearAuthData = () => {
	localStorage.removeItem('nickname');
	localStorage.removeItem('secret');
	localStorage.removeItem('is2FAVerified');
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const location = useLocation();

	useEffect(() => {
		const nickname = localStorage.getItem('nickname');

		if (nickname) {
			setIsAuthenticated(true);
			setIsLoading(false);

			// Background verification to ensure cookie/session is valid.
			// Wait a bit to allow OAuth callback cookie to be properly set
			setTimeout(() => {
				(async () => {
					try {
						const resp = await axios.get<AuthResponse>(createApiUrl('/'), {
							withCredentials: true,
							timeout: 5000,
						});
						if (!resp.data.loggedIn) {
							console.warn(
								'[ProtectedRoute] background verify failed -> clearing auth'
							);
							clearAuthData();
							setIsAuthenticated(false);
						}
					} catch (err) {
						console.error('[ProtectedRoute] background verify error:', err);
						clearAuthData();
						setIsAuthenticated(false);
					}
				})();
			}, 1000);

			return;
		}

		(async () => {
			try {
				const resp = await axios.get<AuthResponse>(createApiUrl('/'), {
					withCredentials: true,
					timeout: 5000,
				});
				setIsAuthenticated(!!resp.data.loggedIn);
			} catch (err) {
				console.error('[ProtectedRoute] initial verify error:', err);
				setIsAuthenticated(false);
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-black text-white">
				<div className="text-xl">Loading...</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/auth" replace state={{ from: location }} />;
	}

	const is2FAVerified = localStorage.getItem('is2FAVerified');
	if (is2FAVerified === 'false') {
		return <Navigate to="/2fa" replace state={{ from: location }} />;
	}

	return children ? <>{children}</> : <Outlet />;
}

export function TwoFactorRoute({ children }: ProtectedRouteProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const location = useLocation();

	useEffect(() => {
		const nickname = localStorage.getItem('nickname');
		console.debug('[TwoFactorRoute] local nickname:', nickname);

		if (nickname) {
			setIsAuthenticated(true);
			setIsLoading(false);

			(async () => {
				try {
					const resp = await axios.get<AuthResponse>(createApiUrl('/'), {
						withCredentials: true,
						timeout: 5000,
					});
					if (!resp.data.loggedIn) {
						console.warn('[TwoFactorRoute] background verify failed -> clearing auth');
						clearAuthData();
						setIsAuthenticated(false);
					}
				} catch (err) {
					console.error('[TwoFactorRoute] background verify error:', err);
					clearAuthData();
					setIsAuthenticated(false);
				}
			})();

			return;
		}

		(async () => {
			try {
				const resp = await axios.get<AuthResponse>(createApiUrl('/'), {
					withCredentials: true,
					timeout: 5000,
				});
				console.debug('[TwoFactorRoute] initial verify:', resp.data);
				setIsAuthenticated(!!resp.data.loggedIn);
			} catch (err) {
				console.error('[TwoFactorRoute] initial verify error:', err);
				setIsAuthenticated(false);
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-black text-white">
				<div className="text-xl">Loading...</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/auth" replace state={{ from: location }} />;
	}

	const is2FAVerified = localStorage.getItem('is2FAVerified');
	if (is2FAVerified === 'true') {
		return <Navigate to="/home" replace />;
	}

	return children ? <>{children}</> : <Outlet />;
}

export function PublicOnlyRoute({ children }: ProtectedRouteProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const location = useLocation();

	useEffect(() => {
		(async () => {
			try {
				const resp = await axios.get<AuthResponse>(createApiUrl('/'), {
					withCredentials: true,
					timeout: 5000,
				});
				console.debug('[PublicOnlyRoute] verify:', resp.data);
				setIsAuthenticated(!!resp.data.loggedIn);
			} catch (err) {
				console.error('[PublicOnlyRoute] verify error:', err);
				setIsAuthenticated(false);
			} finally {
				setIsLoading(false);
			}
		})();
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-black text-white">
				<div className="text-xl">Loading...</div>
			</div>
		);
	}

	if (isAuthenticated) {
		const from = (location.state as any)?.from?.pathname || '/home';
		return <Navigate to={from} replace />;
	}

	return children ? <>{children}</> : <Outlet />;
}
