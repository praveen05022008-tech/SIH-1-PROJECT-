import { useState, useEffect } from 'react';
import { User, SafetyEvent } from './types';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { SifIntelligence } from './pages/SifIntelligence';
import { LifeSavingRules } from './pages/LifeSavingRules';
import { Precursors } from './pages/Precursors';
import { Sites } from './pages/Sites';
import { Review } from './pages/Review';
import { Learning } from './pages/Learning';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { AdminConsole } from './pages/AdminConsole';
import { Detail } from './pages/Detail';
import { WorkerPortal } from './pages/WorkerPortal';
import { TakeAction } from './pages/TakeAction';
import { TrackActions } from './pages/TrackActions';

import { AdminSettings } from './pages/AdminSettings';
import { MyReport } from './pages/MyReport';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AssignedReports } from './pages/AssignedReports';
import { Investigate } from './pages/Investigate';
import { AiAnalysis } from './pages/AiAnalysis';
import { AssignOfficer } from './pages/AssignOfficer';
import { ManagerActions } from './pages/ManagerActions';
import { ManagerAnalytics } from './pages/ManagerAnalytics';
import { ManagerAlerts } from './pages/ManagerAlerts';
import { ManagerRecheck } from './pages/ManagerRecheck';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { SifRisk } from './pages/SifRisk';
import { apiUrl } from './config/api';

function App() {
  // Persistent user state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('raksha_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Persistent navigation state from localStorage
  const [currentPage, setCurrentPage] = useState<string>(() => {
    try {
      const savedPage = localStorage.getItem('raksha_current_page');
      if (savedPage) return savedPage;
      const savedUser = localStorage.getItem('raksha_auth_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role === 'Employee' || u.role === 'Field Worker') return 'dashboard';
        if (u.role === 'Officer' || u.role === 'Safety Officer') return 'dashboard';
        if (u.role === 'Manager' || u.role === 'Safety Manager') return 'dashboard';
        if (u.role === 'Admin') return 'settings';
      }
    } catch {}
    return 'dashboard';
  });

  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Theme state (dark / light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('raksha_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('raksha_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync user state changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('raksha_auth_user', JSON.stringify(user));
      if (user.token) {
        localStorage.setItem('raksha_auth_token', user.token);
      }
    } else {
      localStorage.removeItem('raksha_auth_user');
      localStorage.removeItem('raksha_auth_token');
      localStorage.removeItem('raksha_current_page');
    }
  }, [user]);

  // Sync page changes to localStorage
  useEffect(() => {
    if (user && currentPage) {
      localStorage.setItem('raksha_current_page', currentPage);
    }
  }, [currentPage, user]);

  // Verify and refresh session on mount
  useEffect(() => {
    const token = localStorage.getItem('raksha_auth_token');
    const savedUserStr = localStorage.getItem('raksha_auth_user');
    if (!token && !savedUserStr) return;

    let userEmail = '';
    try {
      if (savedUserStr) {
        userEmail = JSON.parse(savedUserStr).email;
      }
    } catch {}

    fetch(apiUrl('/api/auth/me'), {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-User-Email': userEmail || ''
      }
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        if (res.status === 401 || res.status === 403) {
          console.warn('Session rejected by server – clearing local session.');
          handleLogout();
        }
        return null;
      })
      .then((freshUserData) => {
        if (freshUserData && freshUserData.email) {
          setUser(prev => ({
            ...(prev || {}),
            ...freshUserData,
            token: freshUserData.token || token
          }));
        }
      })
      .catch(() => {
        // Network error / backend offline — silently keep existing session
        console.info('Backend offline – using saved session.');
      });
  }, []);


  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Notification system
  const [notifications, setNotifications] = useState<string[]>([]);

  // System parameters
  const [systemStatus, setSystemStatus] = useState({
    aiEngine: 'Online',
    gati: 'Learning',
    data: 'Healthy'
  });

  // State refresher trigger to push updates across components when reviews or analyses are completed
  const [triggerStateRefresh, setTriggerStateRefresh] = useState(false);

  const triggerNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev]);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.token) {
      localStorage.setItem('raksha_auth_token', loggedInUser.token);
    }
    localStorage.setItem('raksha_auth_user', JSON.stringify(loggedInUser));
    
    // Role based routing redirection
    let defaultPage = 'dashboard';
    if (loggedInUser.role === 'Employee' || loggedInUser.role === 'Field Worker') {
      defaultPage = 'dashboard';
    } else if (loggedInUser.role === 'Officer' || loggedInUser.role === 'Safety Officer') {
      defaultPage = 'dashboard';
    } else if (loggedInUser.role === 'Manager' || loggedInUser.role === 'Safety Manager') {
      defaultPage = 'dashboard';
    } else if (loggedInUser.role === 'Admin') {
      defaultPage = 'settings';
    }
    
    setCurrentPage(defaultPage);
    localStorage.setItem('raksha_current_page', defaultPage);
    triggerNotification(`Authorized as: ${loggedInUser.name} (${loggedInUser.role})`);
  };

  const handleSwitchPersona = (email: string) => {
    let name = 'Demo User';
    let role = 'Safety Manager';
    let defaultPage = 'dashboard';
    
    if (email === 'worker@refinery.safe' || email === 'field.worker@sifdemo.com') {
      name = 'Field Employee / Worker';
      role = 'Field Worker';
      defaultPage = 'dashboard';
    } else if (email === 'officer@refinery.safe' || email === 'officer@sifdemo.com') {
      name = 'Safety Officer Lead';
      role = 'Safety Officer';
      defaultPage = 'dashboard';
    } else if (email === 'reviewer@refinery.safe') {
      name = 'Demo Reviewer';
      role = 'Safety Officer';
      defaultPage = 'dashboard';
    } else if (email === 'manager@refinery.safe' || email === 'manager@sifdemo.com') {
      name = 'HSE Manager / Lead';
      role = 'Safety Manager';
      defaultPage = 'dashboard';
    } else if (email === 'admin@refinery.safe' || email === 'admin@sifdemo.com') {
      name = 'System Administrator';
      role = 'Admin';
      defaultPage = 'settings';
    }

    const updatedUser: User = {
      email,
      name,
      role,
      token: `token-${role.toLowerCase().replace(/\s+/g, '-')}-${email}`
    };
    
    setUser(updatedUser);
    localStorage.setItem('raksha_auth_user', JSON.stringify(updatedUser));
    localStorage.setItem('raksha_auth_token', updatedUser.token || '');
    localStorage.setItem('raksha_current_page', defaultPage);
    setCurrentPage(defaultPage);
    setSelectedEvent(null);
    triggerNotification(`Switched persona to: ${name} (${role})`);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedEvent(null);
    setCurrentPage('dashboard');
    localStorage.removeItem('raksha_auth_user');
    localStorage.removeItem('raksha_auth_token');
    localStorage.removeItem('raksha_current_page');
  };

  const handleViewEvent = (evt: SafetyEvent) => {
    setSelectedEvent(evt);
    setCurrentPage('detail');
  };

  const handleBackToInbox = () => {
    setSelectedEvent(null);
    setCurrentPage('inbox');
  };

  const handleRefreshApp = () => {
    setTriggerStateRefresh(prev => !prev);
  };

  const getPageTitle = () => {
    if (currentPage === 'detail' && selectedEvent) {
      return `Safety Alert: ${selectedEvent.id}`;
    }
    if ((user?.role === 'Field Worker' || user?.role === 'Employee') && currentPage === 'dashboard') {
      return 'Employee Safety Dashboard';
    }
    if (currentPage === 'report-issue' || currentPage === 'worker-portal') {
      return 'Report Safety Issue';
    }
    if (user?.role === 'Safety Officer' && currentPage === 'inbox') {
      return 'Safety Officer Intelligence Console';
    }
    if (user?.role === 'Safety Manager' && currentPage === 'manager') {
      return 'HSE Manager Command Center';
    }
    if (user?.role === 'Admin' && currentPage === 'settings') {
      return 'System Administration Console';
    }

    const titles: Record<string, string> = {
      manager: 'HSE Manager Command Center',
      dashboard: user?.role === 'Safety Officer' ? 'Safety Officer Dashboard' : 'Executive Safety Dashboard',
      inbox: 'Safety Alerts',
      analysis: 'Report Analysis Engine',
      sif: 'SIF Risk Intelligence',
      lsr: 'Life-Saving Rules Conformance',
      precursors: 'Recurring Precursor Patterns',
      sites: 'Sites Operational Risk Context',
      review: 'Review & Validate',
      learning: 'GATI Continuous Learning Centre',
      reports: 'Compliance Reports Exporter',
      settings: 'Admin Dashboard',
      'admin-requests': 'Admin Requests — Access Management',
      'admin-users': 'User Directory',
      'admin-roles': 'Role Governance',
      'admin-reports': 'All Reports — Admin View',
      'admin-audit': 'Audit Log',
      'admin-settings': 'System Settings',
      'report-issue': 'Report Safety Issue',
      'worker-portal': 'Report Safety Issue',
      'my-report': 'My Safety Reports',
      'take-action': 'Take Action',
      'track-actions': 'Track Actions',
      'assigned-reports': 'Assigned Safety Reports',
      investigate: 'Investigate Safety Issue',
      'ai-analysis': 'AI & NLP Safety Analysis',
      'assign-officer': 'Assign Officer to Report',
      're-check': 'Re-Check Review & Final Sign-off Queue',
      'manager-actions': 'Actions & Corrective Review',
      'manager-analytics': 'Safety Analytics & Trends',
      'manager-alerts': 'Safety Alerts & Escalations',
      'sif-risk': 'SIF Risk Intelligence & Hazard Diagnostics (Cerebras AI)'
    };
    return titles[currentPage] || 'RAKSHA AI Platform';
  };

  // Strict role-based route guard enforcement
  useEffect(() => {
    if (!user) return;
    const isEmployee = user.role === 'Employee' || user.role === 'Field Worker';
    const isOfficer = user.role === 'Officer' || user.role === 'Safety Officer';
    const isManager = user.role === 'Manager' || user.role === 'Safety Manager';
    const employeeAllowed = ['dashboard', 'report-issue', 'worker-portal', 'my-report', 'learning'];
    const managerOnlyPages = ['assign-officer', 'manager-analytics', 'manager-alerts', 'manager-actions'];

    if (isEmployee && !employeeAllowed.includes(currentPage)) {
      setCurrentPage('dashboard');
      setSelectedEvent(null);
    } else if (isOfficer && managerOnlyPages.includes(currentPage)) {
      setCurrentPage('dashboard');
      setSelectedEvent(null);
    } else if ((isOfficer || isManager) && (currentPage === 'settings' || currentPage === 'worker-portal' || currentPage === 'report-issue')) {
      setCurrentPage('dashboard');
      setSelectedEvent(null);
    }
  }, [user, currentPage]);

  // If not logged in, force Login screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex bg-[#F7F9FC] min-h-screen text-[#0B2A56]">
      {/* Left Navigation Sidebar */}
      <Sidebar 
        currentPage={currentPage === 'detail' ? 'inbox' : currentPage} 
        setCurrentPage={(page) => {
          const isEmployee = user.role === 'Employee' || user.role === 'Field Worker';
          const employeeAllowed = ['dashboard', 'report-issue', 'worker-portal', 'my-report', 'learning'];
          if (isEmployee && !employeeAllowed.includes(page)) return;
          setSelectedEvent(null);
          setCurrentPage(page);
          setIsMobileMenuOpen(false);
        }} 
        systemStatus={systemStatus} 
        userRole={user.role}
        user={user}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container Layout */}
      <div className="flex-1 pl-0 md:pl-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        
        {/* Top Header widgets */}
        <Topbar 
          user={user} 
          onLogout={handleLogout} 
          title={getPageTitle()}
          notifications={notifications}
          clearNotifications={() => setNotifications([])}
          onSwitchPersona={handleSwitchPersona}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 pt-20 px-3 sm:px-6 lg:px-8 pb-12 overflow-y-auto">
          {currentPage === 'dashboard' && ['Employee', 'Field Worker'].includes(user.role) && (
            <EmployeeDashboard 
              user={user}
              onNavigateTo={setCurrentPage}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'dashboard' && ['Manager', 'Safety Manager'].includes(user.role) && (
            <ManagerDashboard 
              user={user}
              onNavigateTo={setCurrentPage}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'dashboard' && !['Employee', 'Field Worker', 'Manager', 'Safety Manager'].includes(user.role) && (
            <Dashboard 
              onViewEvent={handleViewEvent} 
              triggerNotification={triggerNotification} 
              triggerStateRefresh={triggerStateRefresh} 
              onNavigateTo={setCurrentPage}
              userRole={user.role}
              userName={user.name}
            />
          )}

          {currentPage === 'inbox' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Inbox 
              onViewEvent={handleViewEvent} 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sif' && !['Employee', 'Field Worker'].includes(user.role) && (
            <SifIntelligence 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sif-risk' && !['Employee', 'Field Worker'].includes(user.role) && (
            <SifRisk 
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'lsr' && !['Employee', 'Field Worker'].includes(user.role) && (
            <LifeSavingRules 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'precursors' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Precursors 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sites' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Sites 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'review' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Review 
              reviewerName={user.name} 
              user={user}
              onReviewSubmitted={handleRefreshApp}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'learning' && (
            <Learning 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'reports' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Reports />
          )}



          {currentPage === 'assign-officer' && (
            <AssignOfficer
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 're-check' && (!['Officer', 'Safety Officer'].includes(user.role)) && (
            <ManagerRecheck
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 're-check' && ['Officer', 'Safety Officer'].includes(user.role) && (
            <AssignedReports
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onNavigateTo={(page, event) => {
                if (page === 'investigate' && event) {
                  setSelectedEvent(event);
                }
                setCurrentPage(page);
              }}
              initialStatusFilter="Submitted"
            />
          )}

          {currentPage === 'manager-actions' && (
            <ManagerActions
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'manager-analytics' && (
            <ManagerAnalytics
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'manager-alerts' && (
            <ManagerAlerts
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'settings' && (
            <AdminConsole
              initialTab="dashboard"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-requests' && (
            <AdminConsole
              initialTab="requests"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-users' && (
            <AdminConsole
              initialTab="users"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-roles' && (
            <AdminConsole
              initialTab="roles"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-reports' && (
            <AdminConsole
              initialTab="reports"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-audit' && (
            <AdminConsole
              initialTab="audit"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-settings' && (
            <AdminSettings
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
            />
          )}

          {(currentPage === 'report-issue' || currentPage === 'worker-portal') && (
            <WorkerPortal 
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onEventCreated={handleRefreshApp}
              onNavigateTo={setCurrentPage}
            />
          )}

          {currentPage === 'my-report' && (
            <MyReport 
              user={user} 
              onNavigateTo={setCurrentPage}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'take-action' && (
            <TakeAction 
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'track-actions' && (
            <TrackActions 
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'assigned-reports' && (
            <AssignedReports
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onNavigateTo={(page, event) => {
                if (event) setSelectedEvent(event);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'investigate' && (
            <Investigate
              user={user}
              selectedEvent={selectedEvent}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onNavigateTo={(page, event) => {
                if (event) setSelectedEvent(event);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'ai-analysis' && (
            <AiAnalysis
              user={user}
              selectedEvent={selectedEvent}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onNavigateTo={(page, event) => {
                if (event) setSelectedEvent(event);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'detail' && selectedEvent && (
            <Detail 
              event={selectedEvent} 
              onBack={handleBackToInbox} 
              reviewerName={user.name} 
              onReviewSubmitted={handleRefreshApp} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
