-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "OAuth2" TEXT,
    "TwoFA_secret" TEXT,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "user_type" TEXT NOT NULL,
    "password" TEXT,
    "is_online" BOOLEAN NOT NULL,
    "last_loginTime" DATETIME NOT NULL,
    "tournament_alias" TEXT NOT NULL,
    "avatar_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Blocked" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blocker_nickname" TEXT NOT NULL,
    "blocked_user_nickname" TEXT NOT NULL,
    CONSTRAINT "Blocked_blocked_user_nickname_fkey" FOREIGN KEY ("blocked_user_nickname") REFERENCES "User" ("nickname") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Blocked_blocker_nickname_fkey" FOREIGN KEY ("blocker_nickname") REFERENCES "User" ("nickname") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "sender_Nickname" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT DEFAULT 'chat_message',
    "matchId" TEXT,
    "challengeId" TEXT,
    "challengeStatus" TEXT,
    CONSTRAINT "Message_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_sender_Nickname_fkey" FOREIGN KEY ("sender_Nickname") REFERENCES "User" ("nickname") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromNickname" TEXT NOT NULL,
    "toNickname" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "FriendRequest_toNickname_fkey" FOREIGN KEY ("toNickname") REFERENCES "User" ("nickname") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FriendRequest_fromNickname_fkey" FOREIGN KEY ("fromNickname") REFERENCES "User" ("nickname") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME,
    "winnerId" TEXT,
    "sf1Player1" TEXT,
    "sf1Player2" TEXT,
    "sf2Player1" TEXT,
    "sf2Player2" TEXT,
    "sf1Winner" TEXT,
    "sf1Score" TEXT,
    "sf2Winner" TEXT,
    "sf2Score" TEXT,
    "finalWinner" TEXT,
    "finalScore" TEXT,
    CONSTRAINT "MatchInfo_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_UserGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_UserGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_UserGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MatchInfoToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MatchInfoToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "MatchInfo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MatchInfoToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_TwoFA_secret_key" ON "User"("TwoFA_secret");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_tournament_alias_key" ON "User"("tournament_alias");

-- CreateIndex
CREATE UNIQUE INDEX "_UserGroups_AB_unique" ON "_UserGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_UserGroups_B_index" ON "_UserGroups"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MatchInfoToUser_AB_unique" ON "_MatchInfoToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_MatchInfoToUser_B_index" ON "_MatchInfoToUser"("B");
