"use client";

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

const data = [
  { error: "Unsupported Format", count: 73 },
  { error: "Poor Scan Quality", count: 55 },
];

const chartConfig = {
  count: {
    label: "Errors",
    color: "#3B82F6", // Blue-500
  },
} satisfies ChartConfig;

const ErrorAnalysis = () => {
  return (
    <Card className="border-gray-200 bg-white h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-gray-800">Error Analysis</CardTitle>
        <CardDescription className="text-gray-600">Common document processing errors</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="error"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 12)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-gray-700"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-gray-600">
          Error tracking overview <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-gray-500 leading-none">
          Showing most common processing errors
        </div>
      </CardFooter>
    </Card>
  );
};

export default ErrorAnalysis;
