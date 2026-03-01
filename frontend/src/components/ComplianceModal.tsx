"use client";

import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Button,
  Card,
  CardBody,
  Chip,
  Progress,
  Tooltip,
} from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { 
  Download, 
  Calendar, 
  Building, 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  Tag,
  Sparkles
} from "lucide-react";
import RadarChart from './compliance/RadarChart';

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  complianceData: {
    id?: string;
    title?: string;
    source?: string;
    deadline?: string;
    riskLevel?: string;
    department?: string;
    description?: string | Record<string, unknown>;
    compliance_summary?: Record<string, unknown> | null;
    average_score?: number;
    compliance_status?: string;
    extractedDate?: string;
    keywords?: string[];
    status?: string;
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
  } | null;
}

const ComplianceModal: React.FC<ComplianceModalProps> = ({
  isOpen,
  onClose,
  complianceData,
}) => {
  const router = useRouter();

  // Debug logging to see what data we're receiving
  console.log("ComplianceModal received data:", complianceData);
  console.log("ComplianceModal radarChart data:", complianceData?.radarChart);
  console.log("ComplianceModal riskMatrix data:", complianceData?.riskMatrix);

  if (!complianceData) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
        return { color: 'danger', bg: 'bg-gradient-to-r from-red-50 to-red-100', border: 'border-red-200', icon: AlertTriangle };
      case 'medium':
        return { color: 'warning', bg: 'bg-gradient-to-r from-orange-50 to-yellow-100', border: 'border-orange-200', icon: Shield };
      case 'low':
        return { color: 'success', bg: 'bg-gradient-to-r from-green-50 to-emerald-100', border: 'border-green-200', icon: CheckCircle2 };
      default:
        return { color: 'default', bg: 'bg-gradient-to-r from-gray-50 to-gray-100', border: 'border-gray-200', icon: Shield };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { color: 'warning', bg: 'bg-gradient-to-r from-orange-50 to-amber-100', icon: Clock };
      case 'completed':
        return { color: 'success', bg: 'bg-gradient-to-r from-green-50 to-emerald-100', icon: CheckCircle2 };
      case 'in-progress':
        return { color: 'primary', bg: 'bg-gradient-to-r from-blue-50 to-indigo-100', icon: Sparkles };
      default:
        return { color: 'default', bg: 'bg-gradient-to-r from-gray-50 to-slate-100', icon: Clock };
    }
  };

  const getComplianceScore = () => {
    // Calculate compliance score based on various factors
    let score = 85; // Base score
    if (complianceData.riskLevel?.toLowerCase() === 'high') score -= 15;
    if (complianceData.status?.toLowerCase() === 'pending') score -= 10;
    if (complianceData.keywords && complianceData.keywords.length > 5) score += 5;
    return Math.max(Math.min(score, 100), 0);
  };

  const handleViewInDashboard = () => {
    onClose();
    router.push('/compliance');
  };

  // If the server returned a structured compliance_summary, prefer to render it
  // Parse description if the backend embedded the analysis there (object or JSON string)
  let parsedDescription: Record<string, unknown> | null = null;
  if (typeof complianceData!.description === 'object' && complianceData!.description !== null) {
    parsedDescription = complianceData!.description as Record<string, unknown>;
  } else if (typeof complianceData!.description === 'string') {
    try {
      const parsed = JSON.parse(complianceData!.description as string);
      if (parsed && typeof parsed === 'object') parsedDescription = parsed as Record<string, unknown>;
    } catch {
      parsedDescription = null;
    }
  }

  const summaryObj = complianceData!.compliance_summary && typeof complianceData!.compliance_summary === 'object'
    ? (complianceData!.compliance_summary as Record<string, unknown>)
    : parsedDescription && parsedDescription.compliance_summary && typeof parsedDescription.compliance_summary === 'object'
      ? (parsedDescription.compliance_summary as Record<string, unknown>)
      : null;

  // Also surface overall average_score and compliance_status when available either at top level or inside parsed description
  const averageScore = typeof complianceData!.average_score === 'number' ? complianceData!.average_score : parsedDescription && typeof parsedDescription.average_score === 'number' ? parsedDescription.average_score : undefined;
  const complianceStatus = typeof complianceData!.compliance_status === 'string' ? complianceData!.compliance_status : parsedDescription && typeof parsedDescription.compliance_status === 'string' ? parsedDescription.compliance_status : undefined;

  const extractScoreAndText = (value: unknown): { score?: number; text: string } => {
    if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      const score = typeof v.score === 'number' ? v.score : typeof v.score === 'string' && !isNaN(Number(v.score)) ? Number(v.score) : undefined;
      const text = typeof v.summary === 'string' ? v.summary : JSON.stringify(v);
      return { score, text };
    }
    if (typeof value === 'string') return { text: value };
    return { text: JSON.stringify(value) };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      backdrop="blur"
      closeButton={false}
      scrollBehavior="inside"
      className="max-h-[95vh]"
      classNames={{
        base: "bg-transparent",
        body: "p-0",
        wrapper: "items-center justify-center",
        backdrop: "backdrop-blur-md"
      }}
    >
      <ModalContent className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl max-h-[95vh] flex flex-col">
        <ModalHeader className="p-0">
          <div className="relative w-full">
            {/* Professional Blue Header Background */}
            <div className="absolute inset-0 bg-blue-600"></div>
            <div className="absolute inset-0 bg-blue-700/10"></div>
            
            {/* Header Content */}
            <div className="relative px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-medium text-white/80 uppercase tracking-wider">
                      Compliance Document
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold mb-2 line-clamp-2">
                    {complianceData.title || "Compliance Document"}
                  </h1>
                  <p className="text-white/90 text-sm">
                    {complianceData.source || "Regulatory Authority"}
                  </p>
                </div>
                
                {/* Close Button */}
                <Button
                  isIconOnly
                  variant="light"
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/20 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>

              {/* Status Chips in Header */}
              <div className="flex flex-wrap gap-3 mt-4">
                <Chip
                  variant="flat"
                  color={getStatusColor(complianceData.status || 'pending').color as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                  startContent={React.createElement(getStatusColor(complianceData.status || 'pending').icon, { size: 16 })}
                  className="bg-white/20 text-white border-white/30"
                >
                  {complianceData.status || 'Pending'}
                </Chip>
                <Chip
                  variant="flat"
                  color={getRiskColor(complianceData.riskLevel || '').color as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                  startContent={React.createElement(getRiskColor(complianceData.riskLevel || '').icon, { size: 16 })}
                  className="bg-white/20 text-white border-white/30"
                >
                  {complianceData.riskLevel?.toUpperCase()} RISK
                </Chip>
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="flex-1 overflow-y-auto min-h-[400px]">
          <div className="px-8 py-6 space-y-6">
          {/* Compliance Score Card */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    Compliance Score
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">AI-powered assessment</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{getComplianceScore()}%</div>
                  <Progress 
                    value={getComplianceScore()} 
                    className="w-32 mt-2"
                    color={getComplianceScore() > 80 ? "success" : getComplianceScore() > 60 ? "warning" : "danger"}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Main Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Department Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Department
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {complianceData.department || "Not Assigned"}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Deadline Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Deadline
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {complianceData.deadline ? formatDate(complianceData.deadline) : "Not Set"}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Extracted Date Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Extracted
                      </label>
                      <p className="text-gray-900 font-semibold">
                        {complianceData.extractedDate ? formatDate(complianceData.extractedDate) : formatDate(new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Source Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Source Authority
                      </label>
                      <p className="text-gray-900 font-semibold text-sm">
                        {complianceData.source || "Commissioner Of Metro Rail Safety"}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Description / Compliance Summary Card */}
          <Card className="mb-6 hover:shadow-md transition-shadow">
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Document Details
              </h3>

              {/* If there's a structured compliance_summary object, render its keys as cards */}
              {/* show overall status/average if present */}
              {(typeof averageScore === 'number' || complianceStatus) && (
                <div className="mb-4 flex items-center gap-4">
                  {typeof averageScore === 'number' && (
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-500">Average score</div>
                      <div className="text-xl font-bold text-blue-600">{Math.round(averageScore * 100)}%</div>
                    </div>
                  )}
                  {complianceStatus && (
                    <Chip variant="flat" color={complianceStatus.toLowerCase() === 'non-compliant' ? 'danger' : 'success'} className="border">{complianceStatus}</Chip>
                  )}
                </div>
              )}

              {summaryObj ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(summaryObj).map(([key, value]) => {
                    const { score, text } = extractScoreAndText(value);
                    return (
                      <div key={key} className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</div>
                            <div className="mt-1 text-sm text-gray-800">{text}</div>
                          </div>
                          {typeof score === 'number' && (
                            <div className="flex flex-col items-end">
                              <div className="text-2xl font-bold text-blue-600">{Math.round(score)}%</div>
                              <Progress value={Math.max(0, Math.min(100, Math.round(score)))} className="w-32 mt-2" color={score > 80 ? "success" : score > 60 ? "warning" : "danger"} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Fallback: render description (string) or pretty JSON for objects
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-500">
                  {typeof complianceData.description === 'string' ? (
                    <p className="text-gray-800 leading-relaxed">{complianceData.description}</p>
                  ) : (
                    <pre className="text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(complianceData.description || complianceData, null, 2)}</pre>
                  )}
                </div>
              )}

            </CardBody>
          </Card>

          {/* Keywords Section */}
          {complianceData.keywords && complianceData.keywords.length > 0 && (
            <Card className="mb-6 hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-gray-600" />
                  Keywords & Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {complianceData.keywords.map((keyword, index) => (
                    <Chip
                      key={index}
                      variant="flat"
                      color="primary"
                      className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      {keyword}
                    </Chip>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Risk Analysis Section */}
          {complianceData.radarChart && (
            <Card className="mb-6 hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-6 h-6 text-red-600" />
                  <h3 className="text-xl font-bold text-gray-900">Risk Analysis</h3>
                </div>

                {/* Radar Chart */}
                <RadarChart data={complianceData.radarChart} />
              </CardBody>
            </Card>
          )}

          {/* Debug Section - Show raw data if radar chart is not available */}
          {!complianceData.radarChart && (
            <Card className="mb-6 bg-yellow-50 border border-yellow-200">
              <CardBody className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800">Debug Information</h3>
                </div>
                <p className="text-yellow-700 text-sm mb-4">
                  Radar chart data not found. Available data structure:
                </p>
                <pre className="text-xs text-gray-600 bg-white p-4 rounded border overflow-x-auto">
                  {JSON.stringify(complianceData, null, 2)}
                </pre>
              </CardBody>
            </Card>
          )}

          {/* Document Actions Card */}
          <Card className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-gray-600" />
                Document Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Tooltip content="Download the original document">
                  <Button
                    color="primary"
                    variant="flat"
                    className="w-full"
                    startContent={<Download size={18} />}
                  >
                    Download PDF
                  </Button>
                </Tooltip>
                <Tooltip content="Preview document in new tab">
                  <Button
                    color="default"
                    variant="flat"
                    className="w-full"
                    startContent={<Eye size={18} />}
                  >
                    Preview Document
                  </Button>
                </Tooltip>
              </div>
            </CardBody>
          </Card>

          {/* Action Buttons - Fixed at bottom */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6 mt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                color="danger"
                variant="light"
                onClick={onClose}
                className="flex-1 hover:bg-red-50"
              >
                Close
              </Button>
              <Button
                color="default"
                variant="solid"
                onClick={handleViewInDashboard}
                className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
                startContent={<CheckCircle2 size={18} />}
              >
                Acknowledge
              </Button>
              <Button
                color="primary"
                variant="solid"
                onClick={handleViewInDashboard}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                startContent={<ExternalLink size={18} />}
              >
                View in Dashboard
              </Button>
            </div>
          </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ComplianceModal;