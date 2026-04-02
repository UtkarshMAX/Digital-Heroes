import React from 'react';
import { Navigate, createBrowserRouter } from "react-router";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { useAuth } from "./providers/AuthProvider";

const AppLayout = React.lazy(() => import('./components/Layout').then((module) => ({ default: module.AppLayout })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Home = React.lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Login = React.lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Signup = React.lazy(() => import('./pages/Signup').then((module) => ({ default: module.Signup })));
const Scores = React.lazy(() => import('./pages/Scores').then((module) => ({ default: module.Scores })));
const DrawResults = React.lazy(() => import('./pages/DrawResults').then((module) => ({ default: module.DrawResults })));
const Subscription = React.lazy(() => import('./pages/Subscription').then((module) => ({ default: module.Subscription })));
const Charity = React.lazy(() => import('./pages/Charity').then((module) => ({ default: module.Charity })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const CharityDirectory = React.lazy(() => import('./pages/CharityDirectory').then((module) => ({ default: module.CharityDirectory })));
const CharityProfile = React.lazy(() => import('./pages/CharityProfile').then((module) => ({ default: module.CharityProfile })));
const HowItWorks = React.lazy(() => import('./pages/HowItWorks').then((module) => ({ default: module.HowItWorks })));

function RouteLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Loading your experience...
      </div>
    </div>
  );
}

function suspense(element: React.ReactNode) {
  return (
    <React.Suspense fallback={<RouteLoadingScreen />}>
      {element}
    </React.Suspense>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoadingScreen />;
  }

  return user ? suspense(<AppLayout />) : <Navigate to="/" replace />;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoadingScreen />;
  }

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return user.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: suspense(<Home />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/charities",
    element: suspense(<CharityDirectory />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/charities/:slug",
    element: suspense(<CharityProfile />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/how-it-works",
    element: suspense(<HowItWorks />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: suspense(<GuestOnly><Login /></GuestOnly>),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/signup",
    element: suspense(<GuestOnly><Signup /></GuestOnly>),
    errorElement: <RouteErrorBoundary />,
  },
  {
    element: suspense(<ProtectedRoutes />),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/dashboard", element: suspense(<Dashboard />) },
      { path: "/scores", element: suspense(<Scores />) },
      { path: "/draws", element: suspense(<DrawResults />) },
      { path: "/subscription", element: suspense(<Subscription />) },
      { path: "/charity", element: suspense(<Charity />) },
      { path: "/admin", element: suspense(<AdminOnly><AdminDashboard /></AdminOnly>) },
    ],
  },
]);
