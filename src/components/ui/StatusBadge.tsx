import { TicketStatus } from '../../types';

const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  assigned: { label: 'Assigned', color: 'bg-cyan-100 text-cyan-700' },
  acknowledged: { label: 'Acknowledged', color: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  waiting_for_employee: { label: 'Waiting for Employee', color: 'bg-orange-100 text-orange-700' },
  waiting_for_internal_review: { label: 'Internal Review', color: 'bg-purple-100 text-purple-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
  reopened: { label: 'Reopened', color: 'bg-red-100 text-red-700' },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-700' },
};

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  );
}