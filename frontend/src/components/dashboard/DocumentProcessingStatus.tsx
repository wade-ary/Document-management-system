"use client";

import { TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const data = [
  { 
    week: "Week 1", 
    processed: 45, 
    pending: 12, 
    failed: 3,
    total: 60
  },
  { 
    week: "Week 2", 
    processed: 52, 
    pending: 8, 
    failed: 2,
    total: 62
  },
  { 
    week: "Week 3", 
    processed: 48, 
    pending: 15, 
    failed: 4,
    total: 67
  },
  { 
    week: "Week 4", 
    processed: 61, 
    pending: 6, 
    failed: 1,
    total: 68
  },
];

const chartConfig = {
  processed: {
    label: "Processed",
    color: "#10B981", // Green
  },
  pending: {
    label: "Pending",
    color: "#F59E0B", // Yellow
  },
  failed: {
    label: "Failed",
    color: "#EF4444", // Red
  },
} satisfies ChartConfig;

const DocumentProcessingStatus = () => {
  const totalProcessed = data.reduce((acc, curr) => acc + curr.processed, 0);
  const totalPending = data.reduce((acc, curr) => acc + curr.pending, 0);
  const totalFailed = data.reduce((acc, curr) => acc + curr.failed, 0);
  const totalDocuments = totalProcessed + totalPending + totalFailed;

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">Document Processing Status</CardTitle>
        <CardDescription className="text-gray-600">Weekly processing breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stacked Bar Chart */}
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="processed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Processed</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{totalProcessed}</div>
              <div className="text-xs text-gray-500">
                {Math.round((totalProcessed / totalDocuments) * 100)}% success rate
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
              <div className="text-xs text-gray-500">
                {Math.round((totalPending / totalDocuments) * 100)}% in queue
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
              <div className="text-xs text-gray-500">
                {Math.round((totalFailed / totalDocuments) * 100)}% failure rate
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-gray-600">
          Processing efficiency tracking <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-gray-500 text-lg leading-none">
          Total documents processed: {totalDocuments}
        </div>
      </CardFooter>
    </Card>
  );
};

export default DocumentProcessingStatus;
