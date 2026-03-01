"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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
  { month: "Jan", Documents: 10000 },
  { month: "Feb", Documents: 15000 },
  { month: "Mar", Documents: 20000 },
  { month: "Apr", Documents: 25000 },
  { month: "May", Documents: 30000 },
];

const chartConfig = {
  Documents: {
    label: "Documents",
    color: "#3B82F6", // Blue-500
  },
} satisfies ChartConfig;

const DocumentsProcessed = () => {
  return (
    <Card className="border-gray-200 bg-white h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-gray-800">Documents Processed Over Time</CardTitle>
        <CardDescription className="text-gray-600">
          Showing total documents processed for the last 5 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" hideLabel />}
            />
            <Area
              dataKey="Documents"
              type="linear"
              fill="#3B82F6"
              fillOpacity={0.4}
              stroke="#3B82F6"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium text-gray-600">
              Trending up by 20% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-gray-500 flex items-center gap-2 leading-none">
              January - May 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DocumentsProcessed;
