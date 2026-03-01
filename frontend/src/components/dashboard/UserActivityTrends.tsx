"use client";

import { TrendingUp } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis } from "recharts";

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
  { day: "Mon", users: 45, sessions: 120 },
  { day: "Tue", users: 52, sessions: 135 },
  { day: "Wed", users: 48, sessions: 128 },
  { day: "Thu", users: 61, sessions: 155 },
  { day: "Fri", users: 55, sessions: 142 },
  { day: "Sat", users: 38, sessions: 98 },
  { day: "Sun", users: 42, sessions: 110 },
];

const chartConfig = {
  users: {
    label: "Active Users",
    color: "#3B82F6", // Blue-500
  },
  sessions: {
    label: "Sessions",
    color: "#10B981", // Green-500
  },
} satisfies ChartConfig;

const UserActivityTrends = () => {
  return (
    <Card className="border-gray-200 bg-white h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-gray-800">User Activity Trends</CardTitle>
        <CardDescription className="text-gray-600">Daily active users and sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Line
              dataKey="users"
              type="monotone"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
            />
            <Line
              dataKey="sessions"
              type="monotone"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-gray-600">
          Weekly activity overview <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-gray-500 leading-none">
          Showing daily active users and session counts
        </div>
      </CardFooter>
    </Card>
  );
};

export default UserActivityTrends;
