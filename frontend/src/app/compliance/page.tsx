"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardBody } from '@nextui-org/react';
import { Button } from '@nextui-org/react';
import { Input } from '@nextui-org/react';
import { Tabs, Tab } from '@nextui-org/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@nextui-org/react';
import { Chip, Progress, Tooltip } from '@nextui-org/react';
import { 
  Clock, 
  FileText, 
  Upload, 
  Search, 
  Bell, 
  CheckCircle, 
  Download,
  Eye,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  AlertTriangle,
  Sparkles,
  Target,
  ArrowUp,
  Minus
} from 'lucide-react';
import DocumentUpload from '@/components/compliance/DocumentUpload';
import ComplianceAlerts from '@/components/compliance/ComplianceAlerts';
import RecentActivity from '@/components/compliance/RecentActivity';
import ComplianceTrendChart from '@/components/ComplianceTrendChart';
import SmartPriorityWidget from '@/components/SmartPriorityWidget';
import RadarChart from '@/components/compliance/RadarChart';
import { API_ENDPOINTS } from '@/config/api';

/** Dashboard API response shape */
interface DashboardSummary {
  total_with_compliance: number;
  high_risk_count: number;
  medium_risk_count: number;
  urgent_deadline_count: number;
  regulatory_count: number;
  needs_attention_count: number;
}

interface DashboardItem {
  file_id: string;
  filename: string;
  path: string;
  upload_date: string;
  department: string;
  summary: string;
  risk_level: string;
  deadline: string;
  is_regulatory: boolean;
  title: string;
  issuing_authority: string;
  keywords: string[];
  risk_matrix?: ComplianceItem['riskMatrix'];
  radar_chart?: ComplianceItem['radarChart'];
  scores?: Record<string, unknown>;
}

interface DashboardResponse {
  summary: DashboardSummary;
  needs_attention: DashboardItem[];
  high_risk: DashboardItem[];
  urgent_deadline: DashboardItem[];
  regulatory: DashboardItem[];
  items: DashboardItem[];
}

function mapDashboardItemToCompliance(item: DashboardItem): ComplianceItem {
  const deadline = item.deadline || '';
  const deadlineDate = deadline ? new Date(deadline) : null;
  const now = new Date();
  let status: ComplianceItem['status'] = 'pending';
  if (deadlineDate && deadlineDate < now) status = 'overdue';

  return {
    id: item.file_id || '',
    title: item.title || item.filename || 'Untitled',
    source: item.issuing_authority || 'Unknown',
    deadline,
    riskLevel: (item.risk_level?.toLowerCase() || 'low') as 'high' | 'medium' | 'low',
    status,
    department: item.department || 'General',
    description: item.summary || '',
    extractedDate: item.upload_date || '',
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    documentUrl: item.path ? `/view?path=${encodeURIComponent(item.path)}` : undefined,
    riskMatrix: item.risk_matrix,
    radarChart: item.radar_chart,
  };
}

function mapDashboardResponse(data: DashboardResponse): ComplianceItem[] {
  const items = data.items ?? [];
  return items.map(mapDashboardItemToCompliance);
}

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
  riskMatrix?: {
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
  };
  radarChart?: {
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
  };
}

const ComplianceDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);

  const getMockData = (): ComplianceItem[] => [
    {
      id: '1',
      title: 'CMRS Track Inspection Guidelines Update',
      source: 'Commissioner of Metro Rail Safety',
      deadline: '2025-10-15',
      riskLevel: 'high',
      status: 'pending',
      department: 'Engineering',
      description: 'Updated guidelines for monthly track inspection procedures and safety protocols.',
      extractedDate: '2025-09-10',
      keywords: ['track inspection', 'safety protocol', 'CMRS', 'monthly procedure'],
      documentUrl: '/docs/cmrs-track-guidelines.pdf'
    },
    {
      id: '2',
      title: 'MoHUA Emergency Response Protocol',
      source: 'Ministry of Housing & Urban Affairs',
      deadline: '2025-09-30',
      riskLevel: 'high',
      status: 'acknowledged',
      department: 'Operations',
      description: 'New emergency response protocols for metro operations during adverse weather conditions.',
      extractedDate: '2025-09-05',
      keywords: ['emergency response', 'weather protocols', 'MoHUA', 'operations'],
      documentUrl: '/docs/mohua-emergency-protocol.pdf'
    },
    {
      id: '3',
      title: 'Environmental Compliance Report',
      source: 'Kerala State Pollution Control Board',
      deadline: '2025-11-01',
      riskLevel: 'medium',
      status: 'in-progress',
      department: 'Environmental',
      description: 'Annual environmental compliance report submission requirements.',
      extractedDate: '2025-09-08',
      keywords: ['environmental', 'pollution control', 'annual report', 'compliance'],
      documentUrl: '/docs/env-compliance.pdf'
    },
    {
      id: '4',
      title: 'Fire Safety System Audit',
      source: 'Kerala Fire and Rescue Services',
      deadline: '2025-12-15',
      riskLevel: 'low',
      status: 'completed',
      department: 'Safety',
      description: 'Mandatory fire safety system audit and certification requirements.',
      extractedDate: '2025-09-01',
      keywords: ['fire safety', 'audit', 'certification', 'rescue services'],
      documentUrl: '/docs/fire-safety-audit.pdf'
    }
  ];

  // Fetch compliance data from API
  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(API_ENDPOINTS.COMPLIANCE_DASHBOARD);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setComplianceItems(data.data || []);
          } else {
            console.error('Failed to fetch compliance data:', data.error);
            // Fall back to mock data if API fails
            setComplianceItems(getMockData());
          }
        } else {
          console.error('API request failed:', response.statusText);
          // Fall back to mock data if API fails
          setComplianceItems(getMockData());
        }
      } catch (error) {
        console.error('Error fetching compliance data:', error);
        // Fall back to mock data if API fails
        setComplianceItems(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceData();
  }, []);

  const refreshData = async () => {
    const fetchComplianceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(API_ENDPOINTS.COMPLIANCE_DASHBOARD);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setComplianceItems(data.data || []);
          } else {
            console.error('Failed to fetch compliance data:', data.error);
            setComplianceItems(getMockData());
          }
        } else {
          console.error('API request failed:', response.statusText);
          setComplianceItems(getMockData());
        }
      } catch (error) {
        console.error('Error fetching compliance data:', error);
        setComplianceItems(getMockData());
      } finally {
        setLoading(false);
      }
    };
    await fetchComplianceData();
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'acknowledged': return 'primary';
      case 'in-progress': return 'secondary';
      case 'completed': return 'success';
      case 'overdue': return 'danger';
      default: return 'default';
    }
  };

  const filteredItems = complianceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRisk = filterRisk === 'all' || item.riskLevel === filterRisk;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const openItemDetails = (item: ComplianceItem) => {
    setSelectedItem(item);
    onOpen();
  };

  const updateItemStatus = (itemId: string, newStatus: string) => {
    setComplianceItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, status: newStatus as ComplianceItem['status'] } : item
      )
    );
  };

  // Enhanced analytics calculations
  const getComplianceAnalytics = () => {
    const total = complianceItems.length;
    const completed = complianceItems.filter(item => item.status === 'completed').length;
    const pending = complianceItems.filter(item => item.status === 'pending').length;
    const inProgress = complianceItems.filter(item => item.status === 'in-progress').length;
    const highRisk = complianceItems.filter(item => item.riskLevel === 'high').length;
    const overdue = complianceItems.filter(item => {
      const deadline = new Date(item.deadline);
      return deadline < new Date() && item.status !== 'completed';
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const riskScore = total > 0 ? Math.round(((total - highRisk) / total) * 100) : 100;

    return {
      total,
      completed,
      pending,
      inProgress,
      highRisk,
      overdue,
      completionRate,
      riskScore,
      departments: [...new Set(complianceItems.map(item => item.department))].length
    };
  };

  const analytics = getComplianceAnalytics();

  // Smart recommendations based on data
  const getSmartRecommendations = () => {
    const recommendations = [];
    
    if (analytics.overdue > 0) {
      recommendations.push({
        type: 'urgent',
        title: 'Overdue Items Detected',
        description: `${analytics.overdue} compliance items are overdue. Immediate action required.`,
        action: 'Review Overdue',
        icon: AlertTriangle
      });
    }
    
    if (analytics.highRisk > analytics.total * 0.3) {
      recommendations.push({
        type: 'warning',
        title: 'High Risk Concentration',
        description: `${analytics.highRisk} high-risk items need priority attention.`,
        action: 'Prioritize',
        icon: Shield
      });
    }
    
    if (analytics.completionRate > 80) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Compliance',
        description: `${analytics.completionRate}% completion rate. Keep up the great work!`,
        action: 'Maintain',
        icon: Target
      });
    }

    return recommendations;
  };

  const recommendations = getSmartRecommendations();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Grid Pattern Background */}
      <div className="fixed inset-0 bg-slate-50 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col pt-24 px-4 sm:px-6 lg:px-8 py-6 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Page Header - Centered */}
        <div className="text-center space-y-4">
          <div 
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 relative overflow-hidden"
            style={{
              backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px'
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Compliance Dashboard</h1>
              </div>
              <p className="text-slate-600 text-lg">Monitor and manage regulatory compliance</p>
            </div>
          </div>
        </div>

        {/* Centered Tabs */}
        <Tabs 
          selectedKey={activeTab} 
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
          color="primary"
          variant="light"
          classNames={{
            base: "w-full flex justify-center",
            tabList: "bg-white rounded-2xl p-2 border-2 border-slate-200 shadow-md gap-2",
            tab: "px-6 py-4 text-slate-600 font-semibold data-[selected=true]:text-white data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-blue-600 data-[selected=true]:to-purple-600 data-[selected=true]:rounded-xl data-[selected=true]:shadow-lg transition-all duration-200",
            cursor: "hidden",
            panel: "pt-6"
          }}
        >
          <Tab key="dashboard" title={
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              Analytics Dashboard
            </div>
          }>
            <div className="space-y-6">
              {/* Enhanced Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Completion Rate Card */}
                <Card className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-200">
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 font-semibold text-sm mb-1">Completion Rate</p>
                        <p className="text-4xl font-bold text-emerald-600">{analytics.completionRate}%</p>
                        <div className="flex items-center gap-1 mt-3">
                          <div className="p-1 bg-emerald-100 rounded">
                            <ArrowUp size={12} className="text-emerald-600" />
                          </div>
                          <span className="text-xs text-emerald-600 font-semibold">+5% from last month</span>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-100 rounded-xl shadow-md">
                        <CheckCircle size={28} className="text-emerald-600" />
                      </div>
                    </div>
                    <Progress 
                      value={analytics.completionRate} 
                      className="mt-4"
                      color="success"
                      size="md"
                      classNames={{
                        track: "bg-slate-200"
                      }}
                    />
                  </CardBody>
                </Card>

                {/* Risk Score Card */}
                <Card className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-200">
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 font-semibold text-sm mb-1">Risk Score</p>
                        <p className="text-4xl font-bold text-blue-600">{analytics.riskScore}%</p>
                        <div className="flex items-center gap-1 mt-3">
                          <div className="p-1 bg-blue-100 rounded">
                            <ArrowUp size={12} className="text-blue-600" />
                          </div>
                          <span className="text-xs text-blue-600 font-semibold">+2% this week</span>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-xl shadow-md">
                        <Shield size={28} className="text-blue-600" />
                      </div>
                    </div>
                    <Progress 
                      value={analytics.riskScore} 
                      className="mt-4"
                      color="primary"
                      size="md"
                      classNames={{
                        track: "bg-slate-200"
                      }}
                    />
                  </CardBody>
                </Card>

                {/* Active Items Card */}
                <Card className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-200">
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 font-semibold text-sm mb-1">Active Items</p>
                        <p className="text-4xl font-bold text-amber-600">{analytics.pending + analytics.inProgress}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <div className="p-1 bg-amber-100 rounded">
                            <Minus size={12} className="text-amber-600" />
                          </div>
                          <span className="text-xs text-amber-600 font-semibold">3 less than yesterday</span>
                        </div>
                      </div>
                      <div className="p-3 bg-amber-100 rounded-xl shadow-md">
                        <Activity size={28} className="text-amber-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Pending: {analytics.pending}</span>
                      <span className="text-slate-600">Progress: {analytics.inProgress}</span>
                    </div>
                  </CardBody>
                </Card>

                {/* Departments Card */}
                <Card className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-200">
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 font-semibold text-sm mb-1">Departments</p>
                        <p className="text-4xl font-bold text-purple-600">{analytics.departments}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <div className="p-1 bg-purple-100 rounded">
                            <Users size={12} className="text-purple-600" />
                          </div>
                          <span className="text-xs text-purple-600 font-semibold">All active</span>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-xl shadow-md">
                        <Users size={28} className="text-purple-600" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Smart Recommendations */}
              {recommendations.length > 0 && (
                <Card className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 mb-6">
                  <CardBody className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                      </div>
                      AI-Powered Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.map((rec, index) => (
                        <div 
                          key={index}
                          className={`p-5 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-200 ${
                            rec.type === 'urgent' ? 'bg-red-50 border-red-300' :
                            rec.type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                            'bg-emerald-50 border-emerald-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl shadow-sm ${
                              rec.type === 'urgent' ? 'bg-red-200' :
                              rec.type === 'warning' ? 'bg-yellow-200' :
                              'bg-emerald-200'
                            }`}>
                              <rec.icon size={18} className={
                                rec.type === 'urgent' ? 'text-red-700' :
                                rec.type === 'warning' ? 'text-yellow-700' :
                                'text-emerald-700'
                              } />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 mb-1">{rec.title}</h4>
                              <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                              <Button 
                                size="sm" 
                                className={`mt-3 font-semibold rounded-lg ${
                                  rec.type === 'urgent' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                  rec.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                                  'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {rec.action}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Enhanced Search and Filters */}
              <Card className="bg-white rounded-2xl shadow-lg border-2 border-slate-200">
                <CardBody className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="flex-1 w-full">
                      <Input
                        placeholder="Search compliance items with AI-powered search..."
                        startContent={
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Search size={18} className="text-blue-600" />
                          </div>
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                        classNames={{
                          input: "bg-slate-50 font-medium",
                          inputWrapper: "border-2 border-slate-200 hover:border-blue-400 rounded-xl shadow-sm h-12"
                        }}
                      />
                    </div>
                    <div className="flex gap-3 w-full lg:w-auto">
                      <Tooltip content="Filter by risk level">
                        <select 
                          className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white hover:border-blue-400 transition-all font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={filterRisk}
                          onChange={(e) => setFilterRisk(e.target.value)}
                        >
                          <option value="all">All Risk Levels</option>
                          <option value="high">High Risk</option>
                          <option value="medium">Medium Risk</option>
                          <option value="low">Low Risk</option>
                        </select>
                      </Tooltip>
                      <Tooltip content="Filter by status">
                        <select 
                          className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white hover:border-blue-400 transition-all font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </Tooltip>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Enhanced Compliance Items List */}
              <div className="grid gap-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-2xl hover:border-blue-300 transition-all duration-300">
                    <CardBody className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            {/* Status Icon */}
                            <div className={`p-3.5 rounded-xl shadow-md ${
                              item.status === 'completed' ? 'bg-emerald-100' :
                              item.status === 'in-progress' ? 'bg-blue-100' :
                              item.riskLevel === 'high' ? 'bg-red-100' :
                              'bg-amber-100'
                            }`}>
                              {item.status === 'completed' ? 
                                <CheckCircle className="w-7 h-7 text-emerald-600" /> :
                                item.riskLevel === 'high' ? 
                                <AlertTriangle className="w-7 h-7 text-red-600" /> :
                                <Clock className="w-7 h-7 text-amber-600" />
                              }
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-bold text-xl text-slate-900 mb-2 leading-tight">
                                {item.title}
                              </h3>
                              <p className="text-slate-600 mb-3 line-clamp-2 leading-relaxed font-medium">
                                {item.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mb-4">
                                <Chip 
                                  size="sm" 
                                  variant="flat" 
                                  color={getStatusColor(item.status)}
                                  className="font-semibold shadow-sm"
                                >
                                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </Chip>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 shadow-sm ${getRiskColor(item.riskLevel)}`}>
                                  {item.riskLevel.toUpperCase()} RISK
                                </span>
                                <span className="text-sm text-slate-600 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg font-semibold shadow-sm">
                                  <Users size={14} />
                                  {item.department}
                                </span>
                                <span className="text-sm text-slate-600 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg font-semibold shadow-sm">
                                  <Calendar size={14} />
                                  Due: {new Date(item.deadline).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {item.keywords.slice(0, 4).map((keyword, idx) => (
                                  <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-semibold border-2 border-blue-200 shadow-sm">
                                    {keyword}
                                  </span>
                                ))}
                                {item.keywords.length > 4 && (
                                  <span className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1 rounded-lg border-2 border-blue-200 shadow-sm">
                                    +{item.keywords.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button
                            size="sm"
                            variant="flat"
                            startContent={<Eye size={16} />}
                            onPress={() => openItemDetails(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            View Details
                          </Button>
                          {item.status === 'pending' && (
                            <Button
                              size="sm"
                              startContent={<CheckCircle size={16} />}
                              onPress={() => updateItemStatus(item.id, 'acknowledged')}
                              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {filteredItems.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
                  <CardBody className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <FileText className="text-gray-400" size={48} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No compliance items found</h3>
                      <p className="text-gray-600 mb-6">Try adjusting your search criteria or upload new documents.</p>
                      <Button
                        color="primary"
                        startContent={<Upload size={16} />}
                        onPress={() => setActiveTab('upload')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600"
                      >
                        Upload Documents
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </Tab>

          <Tab key="upload" title={
            <div className="flex items-center gap-2">
              <Upload size={18} />
              Document Upload
            </div>
          }>
            <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
              <CardBody className="p-8">
                <div className="text-center mb-6">
                  <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-600 mx-auto mt-1" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Compliance Documents</h2>
                  <p className="text-gray-600">AI-powered document analysis and compliance tracking</p>
                </div>
                <DocumentUpload onUploadComplete={() => {
                  refreshData();
                  setActiveTab('dashboard');
                }} />
              </CardBody>
            </Card>
          </Tab>

          <Tab key="analytics" title={
            <div className="flex items-center gap-2">
              <PieChart size={18} />
              Advanced Analytics
            </div>
          }>
            <div className="space-y-6">
              {/* Top Row - Trends and Priorities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ComplianceTrendChart />
                <SmartPriorityWidget />
              </div>
              
              {/* Second Row - Department Performance and Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Performance */}
                <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
                  <CardBody className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Department Performance
                    </h3>
                    <div className="space-y-4">
                      {[
                        { name: 'Engineering', score: 92, trend: '+5%', color: 'bg-green-500' },
                        { name: 'Legal', score: 88, trend: '+3%', color: 'bg-blue-500' },
                        { name: 'Safety', score: 95, trend: '+8%', color: 'bg-purple-500' },
                        { name: 'HR', score: 85, trend: '+2%', color: 'bg-orange-500' },
                        { name: 'Finance', score: 90, trend: '+4%', color: 'bg-teal-500' },
                        { name: 'Procurement', score: 87, trend: '+6%', color: 'bg-pink-500' }
                      ].map((dept) => (
                        <div key={dept.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${dept.color}`}></div>
                            <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={dept.score} className="w-20" size="sm" color="primary" />
                            <span className="text-sm font-semibold text-gray-900 w-8">{dept.score}%</span>
                            <span className="text-xs text-green-600 font-medium w-8">{dept.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>

                {/* AI Insights & Predictions */}
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                  <CardBody className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      AI Insights & Predictions
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-white/70 rounded-lg border border-purple-100">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Target size={16} className="text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">Performance Forecast</h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Based on current trends, compliance score expected to reach 95% by month-end
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white/70 rounded-lg border border-orange-100">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <AlertTriangle size={16} className="text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">Risk Alert</h4>
                            <p className="text-xs text-gray-600 mt-1">
                              3 items approaching deadline this week. Consider prioritizing safety documents.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white/70 rounded-lg border border-green-100">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp size={16} className="text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">Optimization Tip</h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Engineering department showing excellent compliance. Consider sharing best practices.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Third Row - Compliance Timeline and Sample Risk Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compliance Timeline */}
                <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
                  <CardBody className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Upcoming Deadlines
                    </h3>
                    <div className="space-y-3">
                      {[
                        { title: 'Fire Safety Audit', date: '2025-09-25', days: 4, priority: 'high' },
                        { title: 'Environmental Report', date: '2025-09-30', days: 9, priority: 'medium' },
                        { title: 'Track Inspection', date: '2025-10-05', days: 14, priority: 'medium' },
                        { title: 'Emergency Protocol Review', date: '2025-10-15', days: 24, priority: 'low' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              item.priority === 'high' ? 'bg-red-500' :
                              item.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-600">{item.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{item.days} days</p>
                            <p className={`text-xs ${
                              item.priority === 'high' ? 'text-red-600' :
                              item.priority === 'medium' ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {item.priority}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>

                {/* Sample Risk Analysis Preview */}
                <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
                  <CardBody className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      Risk Analysis Overview
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-800">High Risk Items</span>
                          <span className="text-lg font-bold text-red-900">{analytics.highRisk}</span>
                        </div>
                        <Progress value={(analytics.highRisk / analytics.total) * 100} className="mb-2" color="danger" size="sm" />
                        <p className="text-xs text-red-700">Require immediate attention</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm font-medium text-blue-800 mb-1">Safety</div>
                          <div className="text-lg font-bold text-blue-900">4.2/5</div>
                          <div className="w-full h-1 bg-blue-200 rounded-full mt-1">
                            <div className="h-full bg-blue-500 rounded-full" style={{width: '84%'}}></div>
                          </div>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="text-sm font-medium text-yellow-800 mb-1">Legal</div>
                          <div className="text-lg font-bold text-yellow-900">3.8/5</div>
                          <div className="w-full h-1 bg-yellow-200 rounded-full mt-1">
                            <div className="h-full bg-yellow-500 rounded-full" style={{width: '76%'}}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-gray-800 mb-2">Risk Categories</div>
                        <div className="flex flex-wrap gap-1">
                          {['Safety', 'Legal', 'Financial', 'Operational', 'Reputation', 'Environmental'].map((category) => (
                            <span key={category} className="px-2 py-1 bg-white text-xs font-medium text-gray-700 rounded border border-gray-200">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          </Tab>

          <Tab key="alerts" title={
            <div className="flex items-center gap-2">
              <Bell size={18} />
              Smart Alerts
              {analytics.overdue > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {analytics.overdue}
                </span>
              )}
            </div>
          }>
            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200">
                <CardBody className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Critical Alerts
                  </h3>
                  <ComplianceAlerts items={complianceItems} />
                </CardBody>
              </Card>
              
              {/* AI Recommendations */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <CardBody className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    AI Recommendations
                  </h3>
                  <div className="grid gap-4">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <rec.icon size={16} className="text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                            <Button size="sm" color="primary" variant="flat" className="mt-3">
                              {rec.action}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </Tab>

          <Tab key="activity" title={
            <div className="flex items-center gap-2">
              <Activity size={18} />
              Recent Activity
            </div>
          }>
            <div className="space-y-4">
              <Card className="bg-white/80 backdrop-blur-lg border border-white/30">
                <CardBody className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Activity Timeline
                  </h3>
                  <RecentActivity items={complianceItems} />
                </CardBody>
              </Card>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardBody className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{analytics.completed}</div>
                    <div className="text-sm text-green-600">Completed Today</div>
                  </CardBody>
                </Card>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <CardBody className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{analytics.inProgress}</div>
                    <div className="text-sm text-blue-600">In Progress</div>
                  </CardBody>
                </Card>
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                  <CardBody className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-700">{analytics.pending}</div>
                    <div className="text-sm text-orange-600">Pending Review</div>
                  </CardBody>
                </Card>
              </div>
            </div>
          </Tab>
        </Tabs>
      </div>

      {/* Enhanced Item Details Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="3xl" 
        scrollBehavior="inside"
        backdrop="blur"
        classNames={{
          base: "bg-transparent",
          body: "p-0",
          wrapper: "overflow-hidden"
        }}
      >
        <ModalContent className="bg-white rounded-2xl border-2 border-slate-200 shadow-2xl">
          {(onClose) => (
            <>
              <ModalHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-slate-200 p-6 rounded-t-2xl">
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-100 rounded-xl shadow-md">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-800 bg-clip-text text-transparent mb-2">
                        {selectedItem?.title}
                      </h2>
                      <p className="text-slate-600 text-sm font-medium">{selectedItem?.source}</p>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </ModalHeader>
              
              <ModalBody className="px-6 py-6 bg-slate-50">
                {selectedItem && (
                  <div className="space-y-6">
                    {/* Status Chips */}
                    <div className="flex flex-wrap gap-3">
                      <Chip 
                        color={getStatusColor(selectedItem.status)}
                        variant="flat"
                        className="font-semibold shadow-sm border-2"
                      >
                        {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                      </Chip>
                      <Chip 
                        variant="flat"
                        className={`font-semibold border-2 shadow-sm ${getRiskColor(selectedItem.riskLevel)}`}
                      >
                        {selectedItem.riskLevel.toUpperCase()} RISK
                      </Chip>
                    </div>

                    {/* Enhanced Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-white rounded-xl border-2 border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-xl shadow-sm">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                              <p className="text-slate-900 font-bold text-sm">{selectedItem.department}</p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-white rounded-xl border-2 border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-100 rounded-xl shadow-sm">
                              <Calendar className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</label>
                              <p className="text-slate-900 font-bold text-sm">{new Date(selectedItem.deadline).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-white rounded-xl border-2 border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 rounded-xl shadow-sm">
                              <Clock className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Extracted</label>
                              <p className="text-slate-900 font-bold text-sm">{new Date(selectedItem.extractedDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-white rounded-xl border-2 border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                        <CardBody className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-100 rounded-xl shadow-sm">
                              <Shield className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source</label>
                              <p className="text-slate-900 font-bold text-sm">{selectedItem.source}</p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Description */}
                    <Card className="bg-white rounded-xl border-2 border-slate-200 hover:shadow-lg transition-all duration-200">
                      <CardBody className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          Description
                        </h3>
                        <div className="bg-slate-50 rounded-xl p-5 border-l-4 border-blue-500 shadow-sm">
                          <p className="text-slate-800 leading-relaxed font-medium">{selectedItem.description}</p>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Keywords */}
                    <Card className="bg-white rounded-xl border-2 border-slate-200 hover:shadow-lg transition-all duration-200">
                      <CardBody className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.keywords.map((keyword, idx) => (
                            <Chip
                              key={idx}
                              variant="flat"
                              className="bg-blue-50 text-blue-700 border-2 border-blue-200 font-semibold shadow-sm"
                            >
                              {keyword}
                            </Chip>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                    {/* Risk Analysis Section */}
                    {selectedItem.radarChart && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="w-6 h-6 text-red-600" />
                          <h3 className="text-xl font-bold text-gray-900">Risk Analysis</h3>
                        </div>

                        {/* Radar Chart */}
                        <RadarChart data={selectedItem.radarChart} />
                      </div>
                    )}

                    {/* Document Actions */}
                    {selectedItem.documentUrl && (
                      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
                        <CardBody className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Download className="w-5 h-5 text-gray-600" />
                            Document Actions
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                              color="primary"
                              variant="flat"
                              startContent={<Download size={16} />}
                              className="w-full"
                            >
                              Download PDF
                            </Button>
                            <Button
                              color="default"
                              variant="flat"
                              startContent={<Eye size={16} />}
                              className="w-full"
                            >
                              Preview
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                )}
              </ModalBody>
              
              <ModalFooter className="px-6 py-5 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button
                    variant="light"
                    onPress={onClose}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all duration-200"
                  >
                    Close
                  </Button>
                  {selectedItem?.status === 'pending' && (
                    <Button 
                      onPress={() => {
                        updateItemStatus(selectedItem.id, 'acknowledged');
                        onClose();
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      startContent={<CheckCircle size={16} />}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ComplianceDashboard;