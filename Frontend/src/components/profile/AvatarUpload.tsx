import { useRef, useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { profileAPI } from '../../utils/api/profile';

interface AvatarUploadProps {
	userId: string;
	avatarId?: string;
	onSuccess: (updatedProfile: any) => void;
	onError: (error: string) => void;
}

export function AvatarUpload({ userId, avatarId, onSuccess, onError }: AvatarUploadProps) {
	const [uploading, setUploading] = useState(false);
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0) return;

		const file = e.target.files[0];

		if (!profileAPI.validation.isValidFileSize(file)) {
			onError('File too large. Maximum allowed size is 5 MB.');
			return;
		}

		if (!profileAPI.validation.isValidFileType(file)) {
			onError('Unsupported file type. Please use JPG, PNG, GIF, or WebP.');
			return;
		}

		setUploading(true);
		setUploadSuccess(false);

		try {
			const updatedProfile = await profileAPI.uploadAvatar(userId, file);

			setUploadSuccess(true);
			onSuccess(updatedProfile);
			setTimeout(() => setUploadSuccess(false), 3000);
		} catch (error: any) {
			console.error('Error uploading avatar:', error);
			onError(error.response?.data?.message || 'Upload failed. Please try again.');
		} finally {
			setUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	return (
		<div className="relative flex flex-col items-center group">
			<div className="relative">
				<img
					src={
						avatarId
							? `${API_BASE_URL}/avatars/${avatarId}`
							: `${API_BASE_URL}/avatars/default_avatar.png`
					}
					alt="User Avatar"
					className={`
            w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full object-cover border-4
            transition-all duration-300 ease-in-out
            ${
				uploading
					? 'border-yellow-300 opacity-50 animate-pulse'
					: 'border-white hover:border-yellow-300 hover:scale-105'
			}
            ${uploadSuccess ? 'border-green-400 shadow-lg' : ''}
          `}
				/>

				<button
					onClick={() => !uploading && fileInputRef.current?.click()}
					className="absolute inset-0 w-full h-full rounded-full bg-transparent 
                   cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-300
                   hover:bg-black hover:bg-opacity-10 transition-all duration-300"
					disabled={uploading}
					aria-label="Change avatar"
				/>

				{!uploading && (
					<div
						className="absolute inset-0 bg-black bg-opacity-50 rounded-full 
                        flex items-center justify-center opacity-0 group-hover:opacity-100 
                        transition-opacity duration-300 pointer-events-none"
					>
						<span className="text-yellow-300 text-xs font-bold">CHANGE</span>
					</div>
				)}

				{uploading && (
					<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-full pointer-events-none">
						<div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-yellow-300 border-t-transparent"></div>
					</div>
				)}

				{uploadSuccess && (
					<div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-green-400 rounded-full p-1 pointer-events-none">
						<svg
							className="w-3 h-3 sm:w-4 sm:h-4 text-black"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
				)}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
				className="hidden"
				onChange={handleFileChange}
				disabled={uploading}
			/>
		</div>
	);
}
