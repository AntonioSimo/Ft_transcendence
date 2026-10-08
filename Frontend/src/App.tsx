import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Root } from './pages/root';
import { AuthPage } from './pages/AuthPage';
import { AuthCallback } from './pages/AuthCallback';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { SignupForm } from './pages/SignupForm';
import { SocialPage } from './pages/SocialPage';
import { ChatProvider } from './components/chat/ChatContext';
import { GlobalSocketProvider } from './components/shared/GlobalSocket';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { ChatToggleButton } from './components/chat/ChatToggleButton';
import LobbyPage from './pages/Lobby';
import OnlinePongGame from './pages/PongGameOnline';
import TwoFactorSetup from './pages/TwoFactorSetup';
import { TournamentBracket } from './components/tournament/TournamentBracket';
import { ProfileView } from './pages/ProfileView';
import { ProtectedRoute, PublicOnlyRoute, TwoFactorRoute } from './pages/ProtectRoute';

function ChatLayout() {
	const location = useLocation();
	const showChat =
		location.pathname.startsWith('/home') ||
		location.pathname.startsWith('/profile') ||
		location.pathname.startsWith('/social');

	return showChat ? (
		<>
			<ChatToggleButton />
			<ChatDrawer />
		</>
	) : null;
}

function App() {
	return (
		<Router>
			<GlobalSocketProvider>
				<ChatProvider>
					<Routes>
						<Route
							path="/auth"
							element={
								<PublicOnlyRoute>
									<AuthPage />
								</PublicOnlyRoute>
							}
						/>
						<Route path="/auth/callback" element={<AuthCallback />} />
						<Route path="/" element={<Root />} />
						<Route
							path="/signup"
							element={
								<PublicOnlyRoute>
									<SignupForm />
								</PublicOnlyRoute>
							}
						/>
						<Route
							path="/2fa"
							element={
								<TwoFactorRoute>
									<TwoFactorSetup onVerified={() => {}} />
								</TwoFactorRoute>
							}
						/>
						<Route
							path="/profile/:nickname"
							element={
								<ProtectedRoute>
									<ProfileView />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/home"
							element={
								<ProtectedRoute>
									<HomePage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/social"
							element={
								<ProtectedRoute>
									<SocialPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/game"
							element={
								<ProtectedRoute>
									<OnlinePongGame />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/lobby"
							element={
								<ProtectedRoute>
									<LobbyPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/tournament-bracket"
							element={
								<ProtectedRoute>
									<TournamentBracket />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/profile"
							element={
								<ProtectedRoute>
									<ProfilePage />
								</ProtectedRoute>
							}
						/>
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
					<ChatLayout />
				</ChatProvider>
			</GlobalSocketProvider>
		</Router>
	);
}

export default App;
