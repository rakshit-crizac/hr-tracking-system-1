import { Video as LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  href?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-50',
  change,
  href,
  onClick
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ${iconBgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            change.type === 'increase' ? 'bg-green-50 text-green-700' :
            change.type === 'decrease' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {change.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      </div>
    </>
  );

  const baseClasses = "bg-white rounded-xl border border-gray-200 p-5 transition-all";
  const interactiveClasses = href || onClick ? "hover:border-gray-300 hover:shadow-sm cursor-pointer" : "";

  if (href) {
    return (
      <Link to={href} className={`${baseClasses} ${interactiveClasses} block`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} ${interactiveClasses} w-full text-left`}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
}
