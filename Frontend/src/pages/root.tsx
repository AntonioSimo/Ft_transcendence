import { useEffect, useState } from 'react';
import { createApiUrl } from '../config/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface isLoggedInResponse {
	loggedIn: boolean;
}

export function Root() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function checkAuth() {
			try {
				const response = await axios.get<isLoggedInResponse>(createApiUrl('/'), {
					withCredentials: true,
				});
				const isLoggedIn = response.data.loggedIn;
				if (isLoggedIn) {
					navigate('/home');
				} else {
					navigate('/auth');
				}
			} catch (error) {
				console.error('Error checking auth:', error);
				navigate('/auth');
			} finally {
				setLoading(false);
			}
		}
		checkAuth();
	}, [navigate]);

	if (loading) {
		return <div>Loading...</div>;
	}
	return <div>Ops something went wrong, please refresh the page</div>;
}
