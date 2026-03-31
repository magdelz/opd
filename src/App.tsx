import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { SetupProfilePage } from './pages/SetupProfilePage';
import { SearchPage } from './pages/SearchPage';
import { MessagesPage } from './pages/MessagesPage';
import { EventsPage } from './pages/EventsPage';
import { MatchesPage } from './pages/MatchesPage';
import { ProfilePage } from './pages/ProfilePage';
import { PostsPage } from './pages/PostsPage';
import { GroupsPage } from './pages/GroupsPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  useEffect(() => {
    const removeBoltBadge = () => {
      document
        .querySelectorAll('[aria-label="Made in Faon"], a[href*="Faon"]')
        .forEach((el) => el.remove());
    };
    removeBoltBadge();
    const interval = setInterval(removeBoltBadge, 2000);
    return () => clearInterval(interval);
  }, []);

  const [currentPage, setCurrentPage] = useState('home');
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (!user && currentPage !== 'home' && currentPage !== 'login' && currentPage !== 'register') {
      return <HomePage onNavigate={setCurrentPage} />;
    }

    if (user && !profile && currentPage !== 'setup-profile') {
      return <SetupProfilePage onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'login':
        return <AuthPage mode="login" onNavigate={setCurrentPage} />;
      case 'register':
        return <AuthPage mode="register" onNavigate={setCurrentPage} />;
      case 'setup-profile':
        return <SetupProfilePage onNavigate={setCurrentPage} />;
      case 'search':
        return <SearchPage onNavigate={setCurrentPage} />;
      case 'messages':
        return <MessagesPage onNavigate={setCurrentPage} />;
      case 'events':
        return <EventsPage onNavigate={setCurrentPage} />;
      case 'matches':
        return <MatchesPage onNavigate={setCurrentPage} />;
      case 'profile':
        return <ProfilePage onNavigate={setCurrentPage} />;
      case 'posts':
        return <PostsPage onNavigate={setCurrentPage} />;
      case 'groups':
        return <GroupsPage onNavigate={setCurrentPage} />;
      case 'settings':
        return <SettingsPage onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  const showNavbar = currentPage !== 'home' || user;

  return (
    <div className="min-h-screen bg-slate-50">
      {showNavbar && <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />}
      {renderPage()}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}

export default App;
