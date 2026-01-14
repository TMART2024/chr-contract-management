import { TrendingUp, TrendingDown, AlertTriangle, FileText, Users, Building } from 'lucide-react';

export default function DashboardStats({ stats }) {
  const statCards = [
    {
      label: 'Total Contracts',
      value: stats?.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Vendor Contracts',
      value: stats?.vendor || 0,
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Customer Contracts',
      value: stats?.customer || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Expiring Soon (90 days)',
      value: stats?.expiringSoon || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      urgent: true
    },
    {
      label: 'High Risk',
      value: stats?.highRisk || 0,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      urgent: true
    },
    {
      label: 'Auto-Renewal',
      value: stats?.autoRenewal || 0,
      icon: TrendingUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            {stat.urgent && stat.value > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">Requires attention</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
