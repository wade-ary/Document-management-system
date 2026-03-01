"use client";

import React from 'react';
import { Card, CardBody } from '@nextui-org/react';
import { Progress } from '@nextui-org/react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  Users,
  Shield
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

interface ComplianceStatsProps {
  items: ComplianceItem[];
}

const ComplianceStats: React.FC<ComplianceStatsProps> = ({ items }) => {
  // Calculate statistics
  const totalItems = items.length;
  const completedItems = items.filter(item => item.status === 'completed').length;
  const pendingItems = items.filter(item => item.status === 'pending').length;
  const inProgressItems = items.filter(item => item.status === 'in-progress').length;
  const overdueItems = items.filter(item => item.status === 'overdue').length;
  
  const highRiskItems = items.filter(item => item.riskLevel === 'high').length;
  const mediumRiskItems = items.filter(item => item.riskLevel === 'medium').length;
  const lowRiskItems = items.filter(item => item.riskLevel === 'low').length;
  
  const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  // Calculate items due in next 7 days
  const nextWeekItems = items.filter(item => {
    const daysUntilDeadline = Math.ceil(
      (new Date(item.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && item.status !== 'completed';
  }).length;
  
  // Department breakdown
  const departments = items.reduce((acc, item) => {
    acc[item.department] = (acc[item.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const departmentEntries = Object.entries(departments).sort((a, b) => b[1] - a[1]);
  
  // Recent activity (items added in last 7 days)
  const recentItems = items.filter(item => {
    const daysSinceExtracted = Math.ceil(
      (new Date().getTime() - new Date(item.extractedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceExtracted <= 7;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Overview Stats */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Compliance Items</p>
              <p className="text-3xl font-bold text-blue-900">{totalItems}</p>
            </div>
            <div className="bg-blue-200 p-3 rounded-full">
              <FileText className="text-blue-700" size={24} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Completion Rate</span>
              <span className="text-blue-900 font-medium">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress 
              value={completionRate} 
              color="primary" 
              size="sm"
              className="bg-blue-200"
            />
          </div>
        </CardBody>
      </Card>

      {/* Risk Distribution */}
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-red-600 font-medium">High Risk Items</p>
              <p className="text-3xl font-bold text-red-900">{highRiskItems}</p>
            </div>
            <div className="bg-red-200 p-3 rounded-full">
              <AlertTriangle className="text-red-700" size={24} />
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-red-600">Medium Risk</span>
              <span className="text-red-900 font-medium">{mediumRiskItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Low Risk</span>
              <span className="text-red-900 font-medium">{lowRiskItems}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Status Overview */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed Items</p>
              <p className="text-3xl font-bold text-green-900">{completedItems}</p>
            </div>
            <div className="bg-green-200 p-3 rounded-full">
              <CheckCircle className="text-green-700" size={24} />
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">In Progress</span>
              <span className="text-green-900 font-medium">{inProgressItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Pending</span>
              <span className="text-green-900 font-medium">{pendingItems}</span>
            </div>
            {overdueItems > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600">Overdue</span>
                <span className="text-red-900 font-medium">{overdueItems}</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Upcoming Deadlines */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-orange-600 font-medium">Due This Week</p>
              <p className="text-3xl font-bold text-orange-900">{nextWeekItems}</p>
            </div>
            <div className="bg-orange-200 p-3 rounded-full">
              <Clock className="text-orange-700" size={24} />
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-orange-600">Recent Uploads</span>
              <span className="text-orange-900 font-medium">{recentItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-600">Active Depts</span>
              <span className="text-orange-900 font-medium">{departmentEntries.length}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Department Breakdown */}
      <Card className="md:col-span-2">
        <CardBody className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-gray-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Department Breakdown</h3>
          </div>
          <div className="space-y-3">
            {departmentEntries.slice(0, 5).map(([department, count]) => {
              const percentage = (count / totalItems) * 100;
              return (
                <div key={department}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{department}</span>
                    <span className="text-sm text-gray-600">{count} items ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    color="secondary" 
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Compliance Health Score */}
      <Card className="md:col-span-2">
        <CardBody className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-gray-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Compliance Health Score</h3>
          </div>
          
          {/* Calculate health score based on multiple factors */}
          {(() => {
            const completionWeight = 0.4;
            const timelinessWeight = 0.3;
            const riskWeight = 0.3;
            
            const completionScore = (completedItems / totalItems) * 100;
            const timelinessScore = Math.max(0, 100 - (overdueItems / totalItems) * 100);
            const riskScore = Math.max(0, 100 - (highRiskItems / totalItems) * 50);
            
            const healthScore = (
              completionScore * completionWeight +
              timelinessScore * timelinessWeight +
              riskScore * riskWeight
            );
            
            const getHealthColor = (score: number) => {
              if (score >= 80) return 'success';
              if (score >= 60) return 'warning';
              return 'danger';
            };
            
            const getHealthStatus = (score: number) => {
              if (score >= 80) return 'Excellent';
              if (score >= 60) return 'Good';
              if (score >= 40) return 'Needs Attention';
              return 'Critical';
            };
            
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${
                    healthScore >= 80 ? 'text-green-600' :
                    healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {healthScore.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getHealthStatus(healthScore)} Compliance Health
                  </div>
                  <Progress 
                    value={healthScore} 
                    color={getHealthColor(healthScore)} 
                    size="lg"
                    className="mt-3"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{completionScore.toFixed(0)}%</div>
                    <div className="text-gray-600">Completion</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{timelinessScore.toFixed(0)}%</div>
                    <div className="text-gray-600">Timeliness</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{riskScore.toFixed(0)}%</div>
                    <div className="text-gray-600">Risk Management</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardBody>
      </Card>
    </div>
  );
};

export default ComplianceStats;