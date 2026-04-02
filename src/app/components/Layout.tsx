import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Award, Ticket, Heart, Settings, Users, LogOut, Menu, X, HeartHandshake } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './ui/button';
import { useAuth } from '../providers/AuthProvider';

const userNavItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/scores', label: 'Performance', icon: Award },
  { path: '/draws', label: 'Impact Draws', icon: Ticket },
  { path: '/subscription', label: 'Subscription', icon: Settings },
  { path: '/charity', label: 'My Impact', icon: Heart },
];

const adminNavItems = [
  ...userNavItems,
  { path: '/admin', label: 'Platform Admin', icon: Users },
];

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userIsAdmin = user?.role === 'admin';
  const initials = user?.fullName
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'IG';

  const navItems = userIsAdmin ? adminNavItems : userNavItems;

  async function handleSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <HeartHandshake className="w-6 h-6 text-secondary" />
            </div>
            <span className="font-bold text-xl text-primary tracking-tight">Impact Golf</span>
          </div>
          <button className="lg:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-secondary" : "text-muted-foreground")} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-border/50">
          <div className="bg-muted/50 rounded-xl p-4 mb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Current Impact</p>
            <p className="text-lg font-bold text-primary">$1,250</p>
            <p className="text-xs text-muted-foreground mt-1">donated this year</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc]">
        {/* Top Header */}
        <header className="flex items-center justify-between h-20 px-4 sm:px-8 border-b border-border/50 bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-foreground capitalize hidden sm:block tracking-tight">
              {location.pathname.split('/')[1] || 'Overview'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 pr-6 border-r border-border/50">
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground leading-none">{user?.fullName || 'Impact Member'}</p>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">{userIsAdmin ? 'Platform Admin' : user?.email || 'Impact Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center font-bold text-sm shadow-sm">
                {initials}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
