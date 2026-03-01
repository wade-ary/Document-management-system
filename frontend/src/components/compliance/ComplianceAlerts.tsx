"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { Button } from '@nextui-org/react';
import { Chip } from '@nextui-org/react';
import { Input } from '@nextui-org/react';
import { 
  AlertTriangle, 
  Clock, 
  Bell, 
  CheckCircle, 
  XCircle,
  Calendar,
  Users,
  Mail,
  MessageSquare,
  ExternalLink
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

interface ComplianceAlertsProps {
  items: ComplianceItem[];
}

const ComplianceAlerts: React.FC<ComplianceAlertsProps> = ({ items }) => {
  const [activeAlerts, setActiveAlerts] = useState<ComplianceItem[]>([]);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [alertSettings, setAlertSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    reminderDays: 7,
    escalationDays: 3
  });

  useEffect(() => {
    // Filter items that need attention
    const alerts = items.filter(item => {
      const daysUntilDeadline = Math.ceil(
        (new Date(item.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return (
        (item.status === 'pending' || item.status === 'acknowledged') &&
        (daysUntilDeadline <= alertSettings.reminderDays || daysUntilDeadline < 0)
      ) || item.status === 'overdue';
    });

    setActiveAlerts(alerts);
  }, [items, alertSettings.reminderDays]);

  const getUrgencyLevel = (item: ComplianceItem) => {
    const daysUntilDeadline = Math.ceil(
      (new Date(item.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline < 0) return 'overdue';
    if (daysUntilDeadline <= 1) return 'critical';
    if (daysUntilDeadline <= 3) return 'urgent';
    if (daysUntilDeadline <= 7) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'danger';
      case 'critical': return 'danger';
      case 'urgent': return 'warning';
      case 'warning': return 'primary';
      default: return 'default';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'OVERDUE';
      case 'critical': return 'CRITICAL - Due Today/Tomorrow';
      case 'urgent': return 'URGENT - Due in 2-3 days';
      case 'warning': return 'WARNING - Due this week';
      default: return 'NORMAL';
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const days = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days remaining`;
  };

  const filteredAlerts = activeAlerts.filter(item => 
    filterDepartment === 'all' || item.department === filterDepartment
  );

  const departments = Array.from(new Set(items.map(item => item.department)));

  const sendNotification = async (item: ComplianceItem, type: 'email' | 'sms') => {
    // Simulate sending notification
    console.log(`Sending ${type} notification for:`, item.title);
    // In real implementation, this would call your backend notification service
  };

  const escalateAlert = async (item: ComplianceItem) => {
    // Simulate escalation
    console.log('Escalating alert:', item.title);
    // In real implementation, this would notify supervisors/management
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredAlerts.filter(item => getUrgencyLevel(item) === 'overdue').length}
            </div>
            <div className="text-sm text-red-700">Overdue Items</div>
          </CardBody>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredAlerts.filter(item => getUrgencyLevel(item) === 'critical').length}
            </div>
            <div className="text-sm text-orange-700">Critical Alerts</div>
          </CardBody>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredAlerts.filter(item => getUrgencyLevel(item) === 'urgent').length}
            </div>
            <div className="text-sm text-yellow-700">Urgent Items</div>
          </CardBody>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredAlerts.filter(item => getUrgencyLevel(item) === 'warning').length}
            </div>
            <div className="text-sm text-blue-700">Upcoming Deadlines</div>
          </CardBody>
        </Card>
      </div>

      {/* Filters and Settings */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-4 items-center">
              <select 
                className="px-3 py-2 border rounded-lg text-sm"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              
              <div className="flex items-center gap-2 text-sm">
                <Bell size={16} />
                <span>Reminder: {alertSettings.reminderDays} days before deadline</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<Mail size={16} />}
                isDisabled={filteredAlerts.length === 0}
              >
                Send Email Summary
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<MessageSquare size={16} />}
                isDisabled={filteredAlerts.length === 0}
              >
                Broadcast Alert
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Active Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
              <p className="text-gray-600">All compliance items are on track or completed.</p>
            </CardBody>
          </Card>
        ) : (
          filteredAlerts
            .sort((a, b) => {
              // Sort by urgency, then by deadline
              const urgencyOrder = { 'overdue': 0, 'critical': 1, 'urgent': 2, 'warning': 3, 'normal': 4 };
              const aUrgency = getUrgencyLevel(a);
              const bUrgency = getUrgencyLevel(b);
              
              if (urgencyOrder[aUrgency] !== urgencyOrder[bUrgency]) {
                return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
              }
              
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            })
            .map((item) => {
              const urgency = getUrgencyLevel(item);
              return (
                <Card 
                  key={item.id} 
                  className={`border-l-4 ${
                    urgency === 'overdue' ? 'border-l-red-500 bg-red-50' :
                    urgency === 'critical' ? 'border-l-red-400 bg-red-25' :
                    urgency === 'urgent' ? 'border-l-orange-500 bg-orange-25' :
                    urgency === 'warning' ? 'border-l-yellow-500 bg-yellow-25' :
                    'border-l-blue-500'
                  }`}
                >
                  <CardBody>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 mt-1">
                            {urgency === 'overdue' ? (
                              <XCircle className="text-red-500" size={20} />
                            ) : (
                              <AlertTriangle className="text-orange-500" size={20} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Chip 
                                size="sm" 
                                color={getUrgencyColor(urgency)}
                                variant="flat"
                              >
                                {getUrgencyText(urgency)}
                              </Chip>
                              <Chip size="sm" variant="flat">
                                {item.riskLevel.toUpperCase()} RISK
                              </Chip>
                            </div>
                            
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                              {item.title}
                            </h3>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {item.description}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users size={14} />
                                {item.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {getDaysUntilDeadline(item.deadline)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                Deadline: {new Date(item.deadline).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Mail size={16} />}
                          onPress={() => sendNotification(item, 'email')}
                        >
                          Notify
                        </Button>
                        
                        {urgency === 'overdue' || urgency === 'critical' ? (
                          <Button
                            size="sm"
                            color="danger"
                            startContent={<AlertTriangle size={16} />}
                            onPress={() => escalateAlert(item)}
                          >
                            Escalate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            color="primary"
                            startContent={<CheckCircle size={16} />}
                          >
                            Take Action
                          </Button>
                        )}
                        
                        {item.documentUrl && (
                          <Button
                            size="sm"
                            variant="flat"
                            startContent={<ExternalLink size={16} />}
                            isIconOnly
                          />
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })
        )}
      </div>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell size={20} />
            Alert Settings
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Notification Preferences</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={alertSettings.emailNotifications}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev, 
                      emailNotifications: e.target.checked
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Email notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={alertSettings.smsNotifications}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev, 
                      smsNotifications: e.target.checked
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">SMS notifications</span>
                </label>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Timing Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Reminder days before deadline
                  </label>
                  <Input
                    type="number"
                    size="sm"
                    value={alertSettings.reminderDays.toString()}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev, 
                      reminderDays: parseInt(e.target.value) || 7
                    }))}
                    min="1"
                    max="30"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Escalation days for overdue
                  </label>
                  <Input
                    type="number"
                    size="sm"
                    value={alertSettings.escalationDays.toString()}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev, 
                      escalationDays: parseInt(e.target.value) || 3
                    }))}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ComplianceAlerts;