"use client";

import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/config/api";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

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

interface DepartmentDistribution {
  department: string;
  count: number;
}

const DepartmentDistribution: React.FC = () => {
  const [departmentData, setDepartmentData] = useState<DepartmentDistribution[]>([]);

  const shortenDepartmentName = (name: string): string => {
    // Current departments used in the backend
    const mappings: { [key: string]: string } = {
      safety: "Safety",
      hr: "HR",
      finance: "Finance",
      engineering: "Engineering",
      procurement: "Procurement",
      legal: "Legal",
      // Fallback for other variants / casing
      Safety: "Safety",
      HR: "HR",
      Finance: "Finance",
      Engineering: "Engineering",
      Procurement: "Procurement",
      Legal: "Legal",
    };

    // Normalize input to match mapping keys
    if (!name) return name;
    const key = name.toString().trim();
    // try direct match first, then lowercase match
    return mappings[key] || mappings[key.toLowerCase()] || name;
  };

  useEffect(() => {
    const fetchDepartmentDistribution = async () => {
      try {
  const response = await fetch(API_ENDPOINTS.ADMIN.COMBINED_SUMMARY);
  const data = await response.json();

        // Use the department_user_count array from the response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedData = data.user_metrics.department_user_count.map((item: any) => ({
          department: shortenDepartmentName(item.department),
          count: item.count,
        }));

        setDepartmentData(formattedData);
      } catch (error) {
        console.error("Error fetching department distribution:", error);
      }
    };

    fetchDepartmentDistribution();
  }, []);

  // Chart configuration with blue theme
  const chartConfig = {
    count: {
      label: "Users",
      color: "#3B82F6", // Blue-500
    },
  } satisfies ChartConfig;

  // Transform data for shadcn charts
  const chartData = departmentData.map((item) => ({
    department: item.department,
    count: item.count,
  }));

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">Department Wise User Distribution</CardTitle>
        <CardDescription className="text-gray-600">User count by department</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="department"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 8)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-blue-700"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-gray-600">
          Department distribution overview <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-gray-500 leading-none">
          Showing user count across all departments
        </div>
      </CardFooter>
    </Card>
  );
};

export default DepartmentDistribution;
