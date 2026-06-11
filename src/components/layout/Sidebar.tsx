import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Users,
  Settings,
  FolderKanban,
  Clock,
  Calendar,
  BarChart3,
  ClipboardList,
  FileText,
  UserCog,
  Shield,
  Building2,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  X
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { user, isAdmin, isHRAgent } = useAuth();

  const employeeNav: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tickets/new', icon: PlusCircle, label: 'Raise Ticket' },
    { to: '/tickets', icon: Ticket, label: 'My Tickets' },
  ];

  const hrAgentNav: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agent/queue', icon: ClipboardList, label: 'My Queue' },
    { to: '/agent/all-tickets', icon: Ticket, label: 'All Tickets' },
    { to: '/agent/overdue', icon: AlertTriangle, label: 'Overdue' },
  ];

  const adminNav: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/tickets', icon: Ticket, label: 'All Tickets' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/categories', icon: FolderKanban, label: 'Categories' },
    { to: '/admin/sla', icon: Clock, label: 'SLA Policies' },
    { to: '/admin/business-hours', icon: Clock, label: 'Business Hours' },
    { to: '/admin/holidays', icon: Calendar, label: 'Holidays' },
    { to: '/admin/agent-mapping', icon: UserCog, label: 'Agent Mapping' },
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/escalation', icon: Shield, label: 'Escalation Rules' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/admin/audit-logs', icon: FileText, label: 'Audit Logs' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  let navItems: NavItem[] = employeeNav;
  if (isAdmin) {
    navItems = adminNav;
  } else if (isHRAgent) {
    navItems = hrAgentNav;
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className="hidden lg:block relative">
        <aside
          className={`
            bg-white border-r border-gray-200 min-h-screen flex flex-col
            transition-all duration-300 ease-in-out
            ${isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64'}
          `}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-center">
            <div className="flex items-center justify-center flex-1">
              <img
                src="/Crizac_Logo_-_Transpaarent_-_Copy.png"
                alt="Crizac"
                className="h-12"
              />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.employee_code}</p>
              </div>
            </div>
          </div>
        </aside>

        <button
          onClick={onToggleCollapse}
          className={`
            absolute top-4 z-10 p-2 bg-white border border-gray-200 rounded-lg shadow-sm
            text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-300
            ${isCollapsed ? 'left-4' : '-right-4'}
          `}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 lg:hidden
          bg-white border-r border-gray-200 w-64 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center justify-center flex-1">
            <img
              src="/Crizac_Logo_-_Transpaarent_-_Copy.png"
              alt="Crizac"
              className="h-12"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-gray-600">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.employee_code}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
