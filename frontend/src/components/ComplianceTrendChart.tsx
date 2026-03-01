"use client";

import React from 'react';
import { Card, CardBody, Progress } from '@nextui-org/react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface TrendData {
  month: string;
  completion: number;
  risk: number;
  submissions: number;
}

interface ComplianceTrendChartProps {
  data?: TrendData[];
}

const ComplianceTrendChart: React.FC<ComplianceTrendChartProps> = ({ data }) => {
  // Mock trend data if none provided
  const defaultData: TrendData[] = [
    { month: 'Jan', completion: 75, risk: 85, submissions: 23 },
    { month: 'Feb', completion: 82, risk: 88, submissions: 28 },
    { month: 'Mar', completion: 78, risk: 82, submissions: 31 },
    { month: 'Apr', completion: 85, risk: 90, submissions: 27 },
    { month: 'May', completion: 88, risk: 92, submissions: 34 },
    { month: 'Jun', completion: 92, risk: 95, submissions: 29 },
  ];

  const trendData = data || defaultData;
  const currentMonth = trendData[trendData.length - 1];
  const previousMonth = trendData[trendData.length - 2];

  const getChangeIndicator = (current: number, previous: number) => {
    const change = current - previous;
    const percentage = Math.abs(Math.round((change / previous) * 100));
    
    if (change > 0) {
      return { icon: TrendingUp, color: 'text-green-600', text: `+${percentage}%`, bg: 'bg-green-100' };
    } else if (change < 0) {
      return { icon: TrendingDown, color: 'text-red-600', text: `-${percentage}%`, bg: 'bg-red-100' };
    } else {
      return { icon: Minus, color: 'text-gray-600', text: '0%', bg: 'bg-gray-100' };
    }
  };

  const completionTrend = getChangeIndicator(currentMonth.completion, previousMonth.completion);
  const riskTrend = getChangeIndicator(currentMonth.risk, previousMonth.risk);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 hover:shadow-lg transition-all">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Compliance Trends
          </h3>
          <div className="text-xs text-gray-500">Last 6 months</div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white/50 rounded-xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completion Rate</span>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${completionTrend.bg}`}>
                <completionTrend.icon size={12} className={completionTrend.color} />
                <span className={`text-xs font-semibold ${completionTrend.color}`}>
                  {completionTrend.text}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{currentMonth.completion}%</div>
            <Progress 
              value={currentMonth.completion} 
              className="mt-2"
              color="primary"
              size="sm"
            />
          </div>

          <div className="p-4 bg-white/50 rounded-xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Risk Score</span>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${riskTrend.bg}`}>
                <riskTrend.icon size={12} className={riskTrend.color} />
                <span className={`text-xs font-semibold ${riskTrend.color}`}>
                  {riskTrend.text}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{currentMonth.risk}%</div>
            <Progress 
              value={currentMonth.risk} 
              className="mt-2"
              color="success"
              size="sm"
            />
          </div>
        </div>

        {/* Trend Chart Visualization */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Monthly Progress</h4>
          <div className="grid grid-cols-6 gap-2">
            {trendData.map((month) => (
              <div key={month.month} className="text-center">
                <div className="mb-2">
                  <div 
                    className="bg-blue-200 rounded-t-lg mx-auto transition-all hover:bg-blue-300"
                    style={{ 
                      height: `${Math.max(month.completion * 0.8, 20)}px`,
                      width: '20px'
                    }}
                  ></div>
                  <div 
                    className="bg-green-200 rounded-b-lg mx-auto mt-1 transition-all hover:bg-green-300"
                    style={{ 
                      height: `${Math.max(month.risk * 0.6, 15)}px`,
                      width: '20px'
                    }}
                  ></div>
                </div>
                <div className="text-xs font-medium text-gray-600">{month.month}</div>
                <div className="text-xs text-gray-500">{month.submissions}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span className="text-xs text-gray-600">Completion</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span className="text-xs text-gray-600">Risk Score</span>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-white/70 rounded-xl border border-white/30">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Insights</h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Completion rate improved by {Math.abs(currentMonth.completion - trendData[0].completion)}% since January</li>
            <li>• {currentMonth.submissions} documents processed this month</li>
            <li>• Risk management showing {riskTrend.text} trend</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
};

export default ComplianceTrendChart;