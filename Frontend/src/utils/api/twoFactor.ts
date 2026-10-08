import axios from 'axios';
import { createApiUrl } from '../../config/api';

export interface TwoFactorSetupData {
	qrCodeUrl: string | null;
}

export interface TwoFactorVerifyRequest {
	token: string;
	nickname: string;
}

export interface TwoFactorVerifyResponse {
	verified: boolean;
}

export interface TwoFactorError {
	message: string;
	status?: number;
}

async function setup(nickname: string | null): Promise<TwoFactorSetupData> {
	try {
		const response = await axios.get<TwoFactorSetupData>(createApiUrl('/api/2fa/setup'), {
			params: { nickname },
			withCredentials: true,
		});
		return response.data;
	} catch (error: any) {
		throw {
			message: 'Error fetching QR code',
			status: error.response?.status,
		} as TwoFactorError;
	}
}

async function verify(data: TwoFactorVerifyRequest): Promise<TwoFactorVerifyResponse> {
	try {
		const response = await axios.post<TwoFactorVerifyResponse>(
			createApiUrl('/api/2fa/verify'),
			data,
			{ withCredentials: true }
		);
		return response.data;
	} catch (error: any) {
		throw {
			message: 'Error during verification',
			status: error.response?.status,
		} as TwoFactorError;
	}
}

export const twoFactorAPI = {
	setup,
	verify,
};
