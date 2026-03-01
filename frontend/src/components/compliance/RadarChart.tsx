"use client";

import React from 'react';
import { Card, CardBody, Progress, Chip } from '@nextui-org/react';
import { Target, Shield, AlertTriangle, TrendingUp, DollarSign, Users, Globe, FileText } from 'lucide-react';

interface RadarChartData {
  categories: {
    [key: string]: {
      score: number;
      level: string;
      description: string;
    };
  };
  overallScore: number;
  highestRisks: Array<{
    category: string;
    score: number;
  }>;
  riskProfile: string;
  recommendations: string[];
}

interface RadarChartProps {
  data: RadarChartData;
  title?: string;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, title = "Risk Dimensions Analysis" }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Safety': return <Shield className="w-4 h-4" />;
      case 'Legal': return <FileText className="w-4 h-4" />;
      case 'Financial': return <DollarSign className="w-4 h-4" />;
      case 'Operational': return <TrendingUp className="w-4 h-4" />;
      case 'Reputation': return <Users className="w-4 h-4" />;
      case 'Environmental': return <Globe className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'danger';
    if (score >= 3) return 'warning';
    if (score >= 2) return 'primary';
    return 'success';
  };

  const getOverallRiskColor = (score: number) => {
    if (score >= 4) return 'text-red-600';
    if (score >= 3) return 'text-orange-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
      <CardBody className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Overall Risk Profile */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-800">Overall Risk Profile</span>
            <span className={`text-lg font-bold ${getOverallRiskColor(data.overallScore)}`}>
              {data.overallScore.toFixed(1)}/5
            </span>
          </div>
          <Progress 
            value={(data.overallScore / 5) * 100} 
            className="mb-2" 
            color={getScoreColor(data.overallScore)} 
            size="sm"
          />
          <p className="text-sm text-purple-700">{data.riskProfile}</p>
        </div>

        {/* Risk Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(data.categories).map(([category, categoryData]) => (
            <div key={category} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                {getCategoryIcon(category)}
                <span className="text-sm font-medium text-gray-800">{category}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">Risk Score</span>
                <span className="text-lg font-bold text-gray-900">{categoryData.score.toFixed(1)}/5</span>
              </div>
              
              <Progress 
                value={(categoryData.score / 5) * 100} 
                className="mb-2" 
                color={getScoreColor(categoryData.score)} 
                size="sm"
              />
              
              <Chip
                size="sm"
                variant="flat"
                className={`text-xs font-medium ${getCategoryColor(categoryData.level)}`}
              >
                {categoryData.level.toUpperCase()}
              </Chip>
              
              <p className="text-xs text-gray-600 mt-2">{categoryData.description}</p>
            </div>
          ))}
        </div>

        {/* Highest Risk Areas */}
        {data.highestRisks.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="text-sm font-semibold text-red-800">Highest Risk Areas</h4>
            </div>
            <div className="space-y-2">
              {data.highestRisks.map((risk, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(risk.category)}
                    <span className="text-sm font-medium text-gray-800">{risk.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-600">{risk.score.toFixed(1)}</span>
                    <div className="w-16 h-2 bg-red-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${(risk.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-800">AI Recommendations</h4>
            </div>
            <div className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Radar Chart Representation */}
        <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 text-center">Risk Dimensions Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(data.categories).map(([category, categoryData]) => (
              <div key={category} className="text-center">
                <div className="mb-2">
                  {getCategoryIcon(category)}
                </div>
                <div className="text-xs font-medium text-gray-700 mb-1">{category}</div>
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  categoryData.level === 'high' ? 'bg-red-500' :
                  categoryData.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  {Math.round(categoryData.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default RadarChart;
