"use client";

import React, { useState } from 'react';
import { Card, CardBody, Button, Chip, Progress } from '@nextui-org/react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Target,
  TrendingUp,
  Shield,
  Calendar,
  ArrowRight
} from 'lucide-react';

interface PriorityItem {
  id: string;
  title: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  description: string;
}

interface SmartPriorityWidgetProps {
  items?: PriorityItem[];
  onActionClick?: (item: PriorityItem) => void;
}

const SmartPriorityWidget: React.FC<SmartPriorityWidgetProps> = ({ 
  items, 
  onActionClick 
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'warning' | 'info'>('all');

  // Default priority items if none provided
  const defaultItems: PriorityItem[] = [
    {
      id: '1',
      title: 'Overdue Safety Directive',
      type: 'urgent',
      deadline: '2025-09-15',
      priority: 'high',
      action: 'Review Now',
      description: 'CMRS Safety Directive #25/2025 requires immediate acknowledgment'
    },
    {
      id: '2',
      title: 'Upcoming Deadline Alert',
      type: 'warning',
      deadline: '2025-09-25',
      priority: 'medium',
      action: 'Prepare',
      description: 'Environmental compliance report due in 4 days'
    },
    {
      id: '3',
      title: 'Compliance Score Update',
      type: 'success',
      priority: 'low',
      action: 'View Details',
      description: 'Your compliance score improved to 92% this month'
    },
    {
      id: '4',
      title: 'New Regulation Alert',
      type: 'info',
      priority: 'medium',
      action: 'Read More',
      description: 'Updated fire safety protocols now available for review'
    }
  ];

  const priorityItems = items || defaultItems;
  
  const filteredItems = activeFilter === 'all' 
    ? priorityItems 
    : priorityItems.filter(item => item.type === activeFilter);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'urgent':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          chipColor: 'danger' as const
        };
      case 'warning':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          chipColor: 'warning' as const
        };
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          chipColor: 'success' as const
        };
      case 'info':
      default:
        return {
          icon: Bell,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          chipColor: 'primary' as const
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const urgentCount = priorityItems.filter(item => item.type === 'urgent').length;
  const totalItems = priorityItems.length;
  const completionRate = Math.round(((totalItems - urgentCount) / totalItems) * 100);

  return (
    <Card className="bg-white/90 backdrop-blur-lg border border-white/30 hover:shadow-xl transition-all">
      <CardBody className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Smart Priorities</h3>
              <p className="text-sm text-gray-600">AI-powered task prioritization</p>
            </div>
          </div>
          {urgentCount > 0 && (
            <Chip 
              color="danger" 
              variant="flat"
              size="sm"
              startContent={<AlertTriangle size={14} />}
            >
              {urgentCount} Urgent
            </Chip>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Priority Completion</span>
            <span className="text-sm font-bold text-blue-600">{completionRate}%</span>
          </div>
          <Progress 
            value={completionRate} 
            className="mb-2"
            color="primary"
            size="sm"
          />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Target size={12} />
            <span>{totalItems - urgentCount} of {totalItems} items on track</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
          {(['all', 'urgent', 'warning', 'info'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                activeFilter === filter
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter !== 'all' && (
                <span className="ml-1 text-xs">
                  ({priorityItems.filter(item => item.type === filter).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Priority Items */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredItems.map((item) => {
            const config = getTypeConfig(item.type);
            const IconComponent = config.icon;
            
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border ${config.bg} ${config.border} hover:shadow-md transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 bg-white rounded-lg ${config.color}`}>
                    <IconComponent size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {item.title}
                      </h4>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={config.chipColor}
                        className="text-xs"
                      >
                        {item.type}
                      </Chip>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className={`font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        {item.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(item.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="flat"
                        color={config.chipColor}
                        endContent={<ArrowRight size={12} />}
                        className="text-xs px-3 py-1 h-auto"
                        onPress={() => onActionClick?.(item)}
                      >
                        {item.action}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mt-1" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">All clear!</p>
            <p className="text-xs text-gray-600">No {activeFilter} priority items at the moment.</p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <TrendingUp size={12} />
              <span>Productivity up 15%</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield size={12} />
              <span>Risk score: 92%</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default SmartPriorityWidget;