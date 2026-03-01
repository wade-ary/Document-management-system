"use client";

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { Chip } from '@nextui-org/react';
import { Button } from '@nextui-org/react';
import { 
  Clock, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Calendar,
  Users,
  Filter
} from 'lucide-react';

interface ComplianceItem {
  id: string;
  title: string;
  source: string;
  deadline: string;
  riskLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'acknowledged' | 'in-progress' | 'completed' | 'overdue';
  department: string;
  description: string;
  extractedDate: string;
  keywords: string[];
  documentUrl?: string;
}

interface ActivityLog {
  id: string;
  type: 'upload' | 'status_change' | 'deadline_alert' | 'escalation';
  title: string;
  description: string;
  timestamp: string;
  itemId?: string;
  department: string;
  user?: string;
}

interface RecentActivityProps {
  items: ComplianceItem[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ items }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterDays, setFilterDays] = useState(7);

  // Generate activity logs from compliance items
  const generateActivityLogs = (): ActivityLog[] => {
    const logs: ActivityLog[] = [];
    
    // Add upload activities
    items.forEach(item => {
      logs.push({
        id: `upload-${item.id}`,
        type: 'upload',
        title: 'Document Uploaded and Analyzed',
        description: `${item.title} was uploaded and processed by AI for compliance tracking`,
        timestamp: item.extractedDate,
        itemId: item.id,
        department: item.department,
        user: 'System AI'
      });
      
      // Add status change activities (simulated)
      if (item.status !== 'pending') {
        const statusDate = new Date(item.extractedDate);
        statusDate.setDate(statusDate.getDate() + Math.floor(Math.random() * 5) + 1);
        
        logs.push({
          id: `status-${item.id}`,
          type: 'status_change',
          title: `Status Updated to ${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`,
          description: `Compliance item "${item.title}" status was updated`,
          timestamp: statusDate.toISOString().split('T')[0],
          itemId: item.id,
          department: item.department,
          user: `${item.department} Team`
        });
      }
      
      // Add deadline alerts for high-risk items
      if (item.riskLevel === 'high') {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() - Math.floor(Math.random() * 3));
        
        logs.push({
          id: `alert-${item.id}`,
          type: 'deadline_alert',
          title: 'High Priority Deadline Alert',
          description: `Urgent attention required for "${item.title}" - deadline approaching`,
          timestamp: alertDate.toISOString().split('T')[0],
          itemId: item.id,
          department: item.department,
          user: 'Alert System'
        });
      }
    });
    
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const activityLogs = generateActivityLogs();
  
  // Filter activities
  const filteredActivities = activityLogs.filter(log => {
    const daysSinceActivity = Math.ceil(
      (new Date().getTime() - new Date(log.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesDays = daysSinceActivity <= filterDays;
    
    return matchesType && matchesDays;
  });

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'upload': return <Upload className="text-blue-500" size={16} />;
      case 'status_change': return <CheckCircle className="text-green-500" size={16} />;
      case 'deadline_alert': return <AlertTriangle className="text-orange-500" size={16} />;
      case 'escalation': return <AlertTriangle className="text-red-500" size={16} />;
    }
  };

  const getActivityColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'upload': return 'primary';
      case 'status_change': return 'success';
      case 'deadline_alert': return 'warning';
      case 'escalation': return 'danger';
      default: return 'default';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Activity Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">
              {activityLogs.filter(log => log.type === 'upload').length}
            </div>
            <div className="text-sm text-blue-700">Documents Processed</div>
          </CardBody>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardBody className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {activityLogs.filter(log => log.type === 'status_change').length}
            </div>
            <div className="text-sm text-green-700">Status Updates</div>
          </CardBody>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardBody className="text-center p-4">
            <div className="text-2xl font-bold text-orange-600">
              {activityLogs.filter(log => log.type === 'deadline_alert').length}
            </div>
            <div className="text-sm text-orange-700">Alerts Sent</div>
          </CardBody>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <CardBody className="text-center p-4">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(activityLogs.map(log => log.department)).size}
            </div>
            <div className="text-sm text-purple-700">Active Departments</div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex gap-4">
              <select 
                className="px-3 py-2 border rounded-lg text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Activities</option>
                <option value="upload">Document Uploads</option>
                <option value="status_change">Status Changes</option>
                <option value="deadline_alert">Deadline Alerts</option>
                <option value="escalation">Escalations</option>
              </select>
              
              <select 
                className="px-3 py-2 border rounded-lg text-sm"
                value={filterDays}
                onChange={(e) => setFilterDays(parseInt(e.target.value))}
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 3 months</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock size={24} />
            Recent Activity Timeline
          </h2>
        </CardHeader>
        <CardBody>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
              <p className="text-gray-600">No activities found for the selected timeframe and filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4 group">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white border-2 border-gray-200 rounded-full p-2 group-hover:border-blue-300 transition-colors">
                      {getActivityIcon(activity.type)}
                    </div>
                    {index < filteredActivities.length - 1 && (
                      <div className="w-px bg-gray-200 h-12 mt-2"></div>
                    )}
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <Chip 
                          size="sm" 
                          color={getActivityColor(activity.type)}
                          variant="flat"
                        >
                          {activity.type.replace('_', ' ')}
                        </Chip>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {activity.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {activity.user && (
                        <span>by {activity.user}</span>
                      )}
                      {activity.itemId && (
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Eye size={12} />}
                          className="h-6 text-xs"
                        >
                          View Item
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Department Activity</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {Array.from(new Set(filteredActivities.map(log => log.department)))
                .slice(0, 5)
                .map(department => {
                  const count = filteredActivities.filter(log => log.department === department).length;
                  return (
                    <div key={department} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{department}</span>
                      <Chip size="sm" variant="flat">{count} activities</Chip>
                    </div>
                  );
                })}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Activity Types</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {['upload', 'status_change', 'deadline_alert', 'escalation'].map(type => {
                const count = filteredActivities.filter(log => log.type === type).length;
                const label = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={type} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getActivityIcon(type as ActivityLog['type'])}
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                    <Chip size="sm" variant="flat" color={getActivityColor(type as ActivityLog['type'])}>
                      {count}
                    </Chip>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default RecentActivity;