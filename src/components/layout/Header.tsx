import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { searchService, SearchResult } from '../../services/searchService';
import { Bell, LogOut, ChevronDown, Search, X, Check, CheckCheck, Loader2, Ticket, AlertCircle, Menu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '../../types';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isAdmin, isHRAgent } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
    }
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    setLoadingNotifications(true);
    try {
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationNavigate = (notification: Notification) => {
    if (notification.ticket_id && notification.ticket_number) {
      const basePath = isAdmin ? '/admin' : isHRAgent ? '/agent' : '/employee';
      navigate(`${basePath}/tickets/${notification.ticket_id}`);
      setShowNotifications(false);
      if (!notification.is_read) {
        notificationService.markAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchService.searchTickets(
          value,
          user?.id || '',
          isAdmin,
          isHRAgent
        );
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    const basePath = isAdmin ? '/admin' : isHRAgent ? '/agent' : '/employee';
    navigate(`${basePath}/tickets/${result.id}`);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: 'Admin', color: 'bg-red-100 text-red-700' };
    if (isHRAgent) return { label: 'HR Agent', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Employee', color: 'bg-gray-100 text-gray-700' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'assigned':
      case 'acknowledged': return 'bg-purple-100 text-purple-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      case 'escalated': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_assigned':
      case 'ticket_created':
      case 'ticket_updated':
        return <Ticket className="w-4 h-4 text-blue-500" />;
      case 'sla_warning':
      case 'sla_breach':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const role = getRoleBadge();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div ref={searchRef} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets by number, title, or requester..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          {searchQuery && !searchLoading && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No tickets found matching "{searchQuery}"
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
                    >
                      <Ticket className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600 text-sm">{result.ticket_number}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(result.status)}`}>
                            {result.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 truncate">{result.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {result.requester_name} {result.category_name && `• ${result.category_name}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={handleNotificationClick}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationNavigate(notification)}
                        className={`px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notification.is_read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => handleMarkAsRead(notification, e)}
                                  className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {notification.ticket_number && (
                                <span className="text-xs text-blue-600 font-medium">{notification.ticket_number}</span>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-white">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${role.color}`}>
                {role.label}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
