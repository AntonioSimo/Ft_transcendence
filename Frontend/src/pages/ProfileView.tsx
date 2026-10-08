import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import { profileViewAPI } from '../utils/api/profileView';
import type { ProfileViewData, ProfileViewError } from '../utils/api/profileView';

export function ProfileView() {
	const { nickname } = useParams<{ nickname: string }>();
	const [profileData, setProfileData] = useState<ProfileViewData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!nickname) {
			setError('No user specified.');
			setLoading(false);
			return;
		}

		const fetchProfile = async () => {
			try {
				setLoading(true);
				const data = await profileViewAPI.getProfileByNickname(nickname);
				setProfileData(data);
				setError(null);
			} catch (err) {
				const profileError = err as ProfileViewError;
				if (profileError.status) {
					setError(`Error: ${profileError.message} (Status: ${profileError.status})`);
				} else {
					setError(profileError.message);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [nickname]);

	if (loading) {
		return <div className="text-white text-center p-10">Loading profile for {nickname}...</div>;
	}

	if (error) {
		return <div className="text-red-500 text-center p-10">{error}</div>;
	}

	if (!profileData) {
		return <div className="text-yellow-500 text-center p-10">User "{nickname}" not found.</div>;
	}
	return <ProfilePage profileData={profileData} isOwnProfile={false} />;
}
