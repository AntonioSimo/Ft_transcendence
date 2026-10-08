import { useEffect, useState } from 'react';
import { profileAPI } from '../utils/api/profile';
import type { ProfileData } from '../utils/api/profile';
import { AlertMessage } from '../components/profile/AlertMessage';
import { AvatarUpload } from '../components/profile/AvatarUpload';
import { EditableField } from '../components/profile/EditableField';
import { StatsCard } from '../components/profile/StatsCard';
import { FriendsCard } from '../components/profile/FriendsCard';
import { useEditableField } from '../hooks/useEditableField';
import { GoBackButton } from '../components/chat/GoBackButton';

type ProfilePageProps = {
	profileData?: any;
	isOwnProfile?: boolean;
};

export function ProfilePage({
	profileData: initialProfileData,
	isOwnProfile = true,
}: ProfilePageProps) {
	const [profileData, setProfileData] = useState<ProfileData | null>(initialProfileData || null);
	const [loading, setLoading] = useState(!initialProfileData);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const userId = localStorage.getItem('nickname');

	const email = useEditableField();
	const tournamentAlias = useEditableField();

	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => setError(null), 5000);
			return () => clearTimeout(timer);
		}
		if (success) {
			const timer = setTimeout(() => setSuccess(null), 3000);
			return () => clearTimeout(timer);
		}
	}, [error, success]);

	useEffect(() => {
		if (!initialProfileData && userId) {
			const fetchMyProfile = async () => {
				try {
					const data = await profileAPI.getProfile(userId);
					setProfileData(data);
				} catch (err) {
					console.error('Failed to load profile:', err);
					setError('Failed to load your profile.');
				} finally {
					setLoading(false);
				}
			};
			fetchMyProfile();
		}
	}, [initialProfileData, userId]);

	const handleAvatarSuccess = (updatedProfile: any) => {
		// Aggiorna tutti i dati del profilo con quelli ricevuti dal backend
		setProfileData(updatedProfile);
		setSuccess('Avatar updated successfully!');
	};

	const handleUpdateEmail = async () => {
		if (!userId || !email.newValue.trim()) {
			setError('Please enter a valid email');
			return;
		}
		if (!profileAPI.validation.isValidEmail(email.newValue)) {
			setError('Please enter a valid email format');
			return;
		}

		email.setLoading(true);
		setError(null);

		try {
			await profileAPI.updateEmail(userId, email.newValue);
			setProfileData((prev) => (prev ? { ...prev, email: email.newValue.trim() } : null));
			email.cancelEdit();
			setSuccess('Email updated successfully!');
		} catch (error: any) {
			console.error('Error updating email:', error);
			setError(error.response?.data?.message || 'Failed to update email. Please try again.');
		} finally {
			email.setLoading(false);
		}
	};

	const handleUpdateTournamentAlias = async () => {
		if (!userId || !tournamentAlias.newValue.trim()) {
			setError('Please enter a valid tournament alias');
			return;
		}
		if (!profileAPI.validation.isValidTournamentAlias(tournamentAlias.newValue.trim())) {
			setError(
				'Tournament alias must be 3-20 characters long and contain only letters, numbers, underscore and hyphens'
			);
			return;
		}

		tournamentAlias.setLoading(true);
		setError(null);

		try {
			await profileAPI.updateTournamentAlias(userId, tournamentAlias.newValue);
			setProfileData((prev) =>
				prev ? { ...prev, tournament_alias: tournamentAlias.newValue.trim() } : null
			);
			tournamentAlias.cancelEdit();
			setSuccess('Tournament alias updated successfully!');
		} catch (error: any) {
			console.error('Error updating tournament alias:', error);
			setError(
				error.response?.data?.message ||
					'Failed to update tournament alias. Please try again.'
			);
		} finally {
			tournamentAlias.setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center font-press-start px-4">
				<div className="text-yellow-300 text-lg sm:text-xl text-center">
					Loading Profile...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 py-6 sm:p-8 font-press-start">
			<div className="max-w-6xl mx-auto">
				<div className="mb-4">
					<GoBackButton />
				</div>

				{error && (
					<AlertMessage type="error" message={error} onClose={() => setError(null)} />
				)}
				{success && (
					<AlertMessage
						type="success"
						message={success}
						onClose={() => setSuccess(null)}
					/>
				)}

				<div className="flex flex-col sm:flex-row items-center w-full mb-6 sm:mb-8 space-y-6 sm:space-y-0 sm:space-x-6">
					{userId && isOwnProfile && (
						<AvatarUpload
							userId={userId}
							avatarId={profileData?.avatar_id}
							onSuccess={handleAvatarSuccess}
							onError={setError}
						/>
					)}

					{userId && !isOwnProfile && profileData?.avatarUrl && (
						<div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40">
							<img
								src={profileData.avatarUrl}
								alt={`${profileData.nickname}'s avatar`}
								className="w-full h-full rounded-full object-cover border-4 border-yellow-300"
							/>
						</div>
					)}

					<div className="flex-1 text-center sm:text-left">
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-3 sm:mb-4 break-words">
							{profileData?.nickname || userId || 'Unknown User'}
						</h1>

						<div className="space-y-3 text-xs sm:text-sm">
							{isOwnProfile ? (
								<EditableField
									label="Email"
									value={profileData?.email}
									placeholder="Click to add email"
									isEditing={email.isEditing}
									newValue={email.newValue}
									loading={email.loading}
									type="email"
									onValueChange={email.setNewValue}
									onStartEdit={() => {
										setError(null);
										email.startEdit(profileData?.email || '');
									}}
									onSave={handleUpdateEmail}
									onCancel={email.cancelEdit}
									onKeyDown={(e) => email.handleKeyDown(e, handleUpdateEmail)}
								/>
							) : (
								<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
									<span className="text-white font-bold sm:mr-2">Email:</span>
									<span className="text-gray-300">
										{profileData?.email || 'Not set'}
									</span>
								</div>
							)}

							{isOwnProfile ? (
								<EditableField
									label="Tournament Alias"
									value={profileData?.tournament_alias}
									placeholder="Click to set alias"
									isEditing={tournamentAlias.isEditing}
									newValue={tournamentAlias.newValue}
									loading={tournamentAlias.loading}
									type="text"
									maxLength={20}
									onValueChange={tournamentAlias.setNewValue}
									onStartEdit={() => {
										setError(null);
										tournamentAlias.startEdit(
											profileData?.tournament_alias || ''
										);
									}}
									onSave={handleUpdateTournamentAlias}
									onCancel={tournamentAlias.cancelEdit}
									onKeyDown={(e) =>
										tournamentAlias.handleKeyDown(
											e,
											handleUpdateTournamentAlias
										)
									}
								/>
							) : (
								<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
									<span className="text-white font-bold sm:mr-2">
										Tournament Alias:
									</span>
									<span className="text-gray-300">
										{profileData?.tournament_alias || 'Not set'}
									</span>
								</div>
							)}

							<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
								<span className="text-white font-bold sm:mr-2">Last Login:</span>
								<span className="text-gray-300">
									{profileData?.last_loginTime
										? new Date(profileData.last_loginTime).toLocaleDateString(
												'nl-NL',
												{
													day: '2-digit',
													month: '2-digit',
													year: 'numeric',
												}
											)
										: 'Never'}
								</span>
							</div>

							<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
								<span className="text-white font-bold sm:mr-2">Friends:</span>
								<span className="text-yellow-300 font-bold inline-flex items-center">
									{profileData?.friendsNumber || 0}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
					<StatsCard profileData={profileData} />
					<FriendsCard profileData={profileData} />
				</div>
			</div>
		</div>
	);
}
