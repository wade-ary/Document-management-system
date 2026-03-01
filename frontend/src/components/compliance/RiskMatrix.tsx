"use client";

import React from 'react';
import { Card, CardBody, Progress } from '@nextui-org/react';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface RiskMatrixData {
  likelihood: {
    score: number;
    level: string;
    description: string;
  };
  impact: {
    score: number;
    level: string;
    description: string;
  };
  riskLevel: string;
  riskScore: number;
  colorCode: string;
  priority: string;
}

interface RiskMatrixProps {
  data: RiskMatrixData;
  title?: string;
}

const RiskMatrix: React.FC<RiskMatrixProps> = ({ data, title = "Risk Assessment Matrix" }) => {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority.includes('Immediate')) return 'text-red-600 bg-red-50 border-red-200';
    if (priority.includes('High')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (priority.includes('Medium')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
      <CardBody className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Risk Matrix Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {/* Header row */}
          <div className="text-center text-xs font-medium text-gray-600 p-2">
            Impact →
          </div>
          <div className="text-center text-xs font-medium text-gray-600 p-2">
            High
          </div>
          <div className="text-center text-xs font-medium text-gray-600 p-2">
            Medium
          </div>

          {/* Likelihood rows */}
          {['High', 'Medium', 'Low'].map((likelihood, rowIndex) => (
            <React.Fragment key={likelihood}>
              <div className="text-xs font-medium text-gray-600 p-2 flex items-center">
                {likelihood}
                {rowIndex === 0 && <span className="ml-1">↑</span>}
              </div>
              {['High', 'Medium', 'Low'].map((impact) => {
                const isCurrentPosition = 
                  (likelihood === 'High' && data.likelihood.level === 'high') ||
                  (likelihood === 'Medium' && data.likelihood.level === 'medium') ||
                  (likelihood === 'Low' && data.likelihood.level === 'low');
                
                const isCurrentImpact = 
                  (impact === 'High' && data.impact.level === 'high') ||
                  (impact === 'Medium' && data.impact.level === 'medium') ||
                  (impact === 'Low' && data.impact.level === 'low');

                const isActive = isCurrentPosition && isCurrentImpact;
                
                return (
                  <div
                    key={`${likelihood}-${impact}`}
                    className={`h-12 rounded-lg flex items-center justify-center text-white font-medium text-xs border-2 ${
                      isActive 
                        ? `${getRiskLevelColor(data.riskLevel)} border-white shadow-lg` 
                        : 'bg-gray-200 border-gray-300'
                    }`}
                  >
                    {isActive && (
                      <div className="flex items-center gap-1">
                        {getRiskLevelIcon(data.riskLevel)}
                        <span>{data.riskScore}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Risk Details */}
        <div className="space-y-4">
          {/* Likelihood and Impact Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Likelihood</span>
                <span className="text-lg font-bold text-blue-900">{data.likelihood.score.toFixed(1)}/5</span>
              </div>
              <Progress 
                value={(data.likelihood.score / 5) * 100} 
                className="mb-2" 
                color="primary" 
                size="sm"
              />
              <p className="text-xs text-blue-700">{data.likelihood.description}</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-800">Impact</span>
                <span className="text-lg font-bold text-red-900">{data.impact.score.toFixed(1)}/5</span>
              </div>
              <Progress 
                value={(data.impact.score / 5) * 100} 
                className="mb-2" 
                color="danger" 
                size="sm"
              />
              <p className="text-xs text-red-700">{data.impact.description}</p>
            </div>
          </div>

          {/* Risk Level and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                {getRiskLevelIcon(data.riskLevel)}
                <span className="text-sm font-medium text-gray-800">Risk Level</span>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRiskLevelColor(data.riskLevel)}`}>
                {data.riskLevel.toUpperCase()}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Priority</span>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(data.priority)}`}>
                {data.priority}
              </div>
            </div>
          </div>

          {/* Risk Score Visualization */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">Overall Risk Score</span>
              <span className="text-2xl font-bold text-gray-900">{data.riskScore}/5</span>
            </div>
            <Progress 
              value={(data.riskScore / 5) * 100} 
              className="mb-2" 
              color={data.riskLevel === 'critical' ? 'danger' : data.riskLevel === 'high' ? 'warning' : 'success'} 
              size="lg"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default RiskMatrix;
