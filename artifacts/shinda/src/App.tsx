import { Switch, Route, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/auth-modal';
import { lazy, Suspense } from 'react';
import Home from '@/pages/home';

// Bolt: Route-level code splitting using React.lazy to reduce initial bundle size
// Secondary routes and their heavy UI dependencies are loaded on demand.
const HistoryPage = lazy(() => import('@/pages/history'));
const PlayersPage = lazy(() => import('@/pages/players'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/players" component={PlayersPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
