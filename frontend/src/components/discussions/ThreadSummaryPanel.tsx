'use client';

import React, { useState } from 'react';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import type { ThreadSummaryPanelProps } from '@/types/discussions';

export default function ThreadSummaryPanel({
  summary,
  onRegenerateSummary,
  isLoading = false,
}: ThreadSummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summary.auto_generated) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
      <CardBody className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">AI Summary</h4>
            <Chip size="sm" color="primary" variant="flat">
              Auto-generated
            </Chip>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              onClick={onRegenerateSummary}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {/* Summary text */}
            <p className="text-sm text-slate-700">{summary.auto_generated}</p>

            {/* Decisions */}
            {summary.decisions && summary.decisions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <h5 className="font-medium text-green-900">
                    Key Decisions ({summary.decisions.length})
                  </h5>
                </div>
                <ul className="space-y-1 ml-6">
                  {summary.decisions.map((decision, idx) => (
                    <li key={idx} className="text-sm text-slate-700 list-disc">
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {summary.action_items && summary.action_items.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h5 className="font-medium text-amber-900">
                    Action Items ({summary.action_items.length})
                  </h5>
                </div>
                <div className="space-y-2 ml-6">
                  {summary.action_items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Chip
                        size="sm"
                        color={item.status === 'completed' ? 'success' : 'warning'}
                        variant="flat"
                      >
                        {item.status}
                      </Chip>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{item.item}</p>
                        {item.assigned_to && (
                          <p className="text-xs text-slate-500">
                            Assigned to: {item.assigned_to}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.last_updated && (
              <p className="text-xs text-slate-500 italic">
                Last updated: {new Date(summary.last_updated).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
