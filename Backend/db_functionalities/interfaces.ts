export interface UserInt {
	id: string;
	OAuth2: string;
	email: string;
	nickname: string;
	user_type: string;
	is_online: boolean;
	last_loginTime: Date;
	avatar_id: string;
	blocks?: BlockedInt[];
	users_blocked?: BlockedInt[];
	Message?: MessageInt[];
	groups?: GroupInt[];
}

export interface UserCreateInput {
	OAuth2: string;
	email: string;
	nickname: string;
	user_type: string;
	is_online: boolean;
	last_loginTime: Date;
	avatar_id: string;
}

export interface BlockedInt {
	id: string;
	blocker_nickname: string;
	blocked_user_nickname: string;
	blocker?: UserInt;
	blocked_user?: UserInt;
}

export interface MessageInt {
	id: string;
	message: string;
	sender_Nickname: string;
	groupId: string;
	created_at: Date;
	sender?: UserInt;
	group?: GroupInt;
}

export interface GroupInt {
	id: string;
	Chat_messages?: MessageInt[];
	Users?: UserInt[];
}
