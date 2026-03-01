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

interface MonthlyDistribution {
  month: string;
  documents: number;
}

const DocumentHistory: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyDistribution[]>([]);

  useEffect(() => {
    const fetchMonthlyDistribution = async () => {
      try {
  const response = await fetch(API_ENDPOINTS.ADMIN.COMBINED_SUMMARY);
  const data = await response.json();

        // Transform the data into the required format
        const formattedData = Object.entries(data.document_metrics.monthly_distribution).map(
          ([key, value]) => {
            const monthShort = new Date(`${key}-01`).toLocaleString("en-US", {
              month: "short",
            });
            return { month: monthShort, documents: value as number };
          }
        );
        setMonthlyData(formattedData);
      } catch (error) {
        console.error("Error fetching monthly distribution:", error);
      }
    };

    fetchMonthlyDistribution();
  }, []);

  // Chart configuration with blue theme
  const chartConfig = {
    documents: {
      label: "Documents",
      color: "#3B82F6", // Blue-500
    },
  } satisfies ChartConfig;

  // Transform data for shadcn charts
  const chartData = monthlyData.map((item) => ({
    month: item.month,
    documents: item.documents,
  }));

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">Document History</CardTitle>
        <CardDescription className="text-gray-600">Monthly document processing trends</CardDescription>
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
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="documents" fill="#3B82F6" radius={8}>
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
          Monthly processing trends <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-gray-500 leading-none">
          Showing document processing over time
        </div>
      </CardFooter>
    </Card>
  );
};

export default DocumentHistory;
