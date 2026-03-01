"use client";

import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/config/api";
import { Progress } from "@nextui-org/react";
import { TrendingUp } from "lucide-react";
import {
  Label,
  // PolarGrid,
  // PolarRadiusAxis,
  // RadialBar,
  // RadialBarChart,
  Pie,
  PieChart,
} from "recharts";

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
interface MetricsData {
  pendingFiles: number;
  approvedFiles: number;
  rejectedFiles: number;
  totalDocuments: number;
  totalUsers: number;
  monthlyDistribution: { [key: string]: number };
  fileTypeDistribution: { [key: string]: number };
}

const Metrics: React.FC = () => {
  const [metricsData, setMetricsData] = useState<MetricsData>({
    pendingFiles: 0,
    approvedFiles: 0,
    rejectedFiles: 0,
    totalDocuments: 0,
    totalUsers: 0,
    monthlyDistribution: {},
    fileTypeDistribution: {},
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN.COMBINED_SUMMARY);
        const data = await response.json();
        setMetricsData({
          pendingFiles: data.document_metrics.pending_files,
          approvedFiles: data.document_metrics.approved_files,
          rejectedFiles: data.document_metrics.rejected_files,
          totalDocuments: data.document_metrics.total_documents,
          totalUsers: data.user_metrics.total_users,
          monthlyDistribution: data.document_metrics.monthly_distribution,
          fileTypeDistribution: data.document_metrics.file_type_distribution,
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchMetrics();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { totalDocuments, pendingFiles, approvedFiles, totalUsers, fileTypeDistribution } = metricsData;

  // Chart data for file type distribution
  const fileTypeChartData = Object.entries(fileTypeDistribution).map(([key, value], index) => {
    const colors = ["#3B82F6", "#1D4ED8", "#60A5FA", "#93C5FD", "#DBEAFE", "#0EA5E9", "#38BDF8", "#7DD3FC"];
    return {
      fileType: key,
      count: value,
      fill: colors[index % colors.length],
    };
  });

  // Chart data for approval rate (radial chart)
  // const approvalRateData = [
  //   {
  //     approved: approvedFiles,
  //     fill: "#3B82F6", // Blue
  //   },
  // ];

  // Chart configurations with blue theme
  const fileTypeChartConfig = {
    count: {
      label: "Files",
    },
    ...Object.keys(fileTypeDistribution).reduce((acc, key, index) => {
      const colors = ["#3B82F6", "#1D4ED8", "#60A5FA", "#93C5FD", "#DBEAFE", "#0EA5E9", "#38BDF8", "#7DD3FC"];
      acc[key.toLowerCase()] = {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: colors[index % colors.length],
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>),
  } satisfies ChartConfig;

  // const approvalRateChartConfig = {
  //   approved: {
  //     label: "Approved",
  //     color: "#3B82F6", // Blue
  //   },
  // } satisfies ChartConfig;

  return (
    <div className="flex justify-center items-start w-full mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center max-w-7xl mx-auto px-10">
        {/* 1st Card - Total Documents Processed */}
        <Card className="flex flex-col border-gray-200 bg-white">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-lg font-bold text-gray-800">Total Documents Processed</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-0 flex justify-center items-center">
            <div className="text-4xl font-extrabold text-gray-700">
              {totalDocuments.toLocaleString()}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 justify-center leading-none font-medium text-gray-600">
              <TrendingUp className="h-4 w-4" />
              All time processed documents
            </div>
          </CardFooter>
        </Card>

      {/* 2nd Card - Total Users */}
      <Card className="flex flex-col border-gray-200 bg-white">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-lg font-bold text-gray-800">Total Users</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-0 flex justify-center items-center">
          <div className="text-4xl font-extrabold text-gray-700">
            {totalUsers.toLocaleString()}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 justify-center leading-none font-medium text-gray-600">
            <TrendingUp className="h-4 w-4" />
            Registered users
          </div>
        </CardFooter>
      </Card>

      {/* 3rd Card - Document Approval Rate (Radial Chart) */}
      {/* <Card className="flex flex-col border-gray-200 bg-white">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-lg font-bold text-gray-800">Document Approval Rate</CardTitle>
          <CardDescription className="text-gray-600">Current approval percentage</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={approvalRateChartConfig}
            className="mx-auto aspect-square max-h-[200px]"
          >
            <RadialBarChart
              data={approvalRateData}
              startAngle={0}
              endAngle={250}
              innerRadius={60}
              outerRadius={90}
            >
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                className="first:fill-gray-200 last:fill-gray-50"
                polarRadius={[66, 54]}
              />
              <RadialBar dataKey="approved" background cornerRadius={10} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-gray-700 text-3xl font-bold"
                          >
                            {((approvedFiles / totalDocuments) * 100 || 0).toFixed(1)}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-gray-600 text-sm"
                          >
                            Approved
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </PolarRadiusAxis>
            </RadialBarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium text-gray-600">
            <TrendingUp className="h-4 w-4" />
            {approvedFiles.toLocaleString()} of {totalDocuments.toLocaleString()} documents
          </div>
        </CardFooter>
      </Card> */}

      {/* 4th Card - File Type Distribution (Pie Chart) */}
      <Card className="flex flex-col border-gray-200 bg-white">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-lg font-bold text-gray-800">File Type Distribution</CardTitle>
          <CardDescription className="text-gray-600">Document types breakdown</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={fileTypeChartConfig}
            className="mx-auto aspect-square max-h-[200px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={fileTypeChartData}
                dataKey="count"
                nameKey="fileType"
                innerRadius={50}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const totalFiles = fileTypeChartData.reduce((acc, curr) => acc + curr.count, 0);
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-gray-700 text-2xl font-bold"
                          >
                            {totalFiles.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-gray-600 text-sm"
                          >
                            Files
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 justify-center leading-none font-medium text-gray-600">
            <TrendingUp className="h-4 w-4" />
            Showing file type distribution
          </div>
        </CardFooter>
      </Card>

      {/* 5th Card - Total Documents Pending */}
      <Card className="flex flex-col border-gray-200 bg-white">
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-lg font-bold text-gray-800">Documents Pending</CardTitle>
          <CardDescription className="text-gray-600">Awaiting approval</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0 flex justify-center items-center">
          <div className="w-full max-w-xs">
            <Progress
              label="Pending"
              size="md"
              value={pendingFiles}
              maxValue={totalDocuments}
              color="secondary"
              valueLabel={`${pendingFiles.toLocaleString()} / ${totalDocuments.toLocaleString()}`}
              showValueLabel={true}
              classNames={{
                base: "max-w-md text-sm",
                track: "drop-shadow-md bg-blue-200/50",
                indicator: "bg-gradient-to-r from-blue-500 to-blue-600",
                label: "font-medium text-blue-700",
                value: "text-blue-600",
              }}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 justify-center leading-none font-medium text-gray-600">
            <TrendingUp className="h-4 w-4" />
            {((pendingFiles / totalDocuments) * 100 || 0).toFixed(1)}% pending
          </div>
        </CardFooter>
      </Card>
    </div>
    </div>
  );
};

export default Metrics;
