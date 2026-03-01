"use client";

import { TrendingUp, Cpu, HardDrive, Wifi } from "lucide-react";
import { Pie, PieChart, Label } from "recharts";

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
  { resource: "CPU", usage: 65, fill: "#3B82F6" },
  { resource: "Memory", usage: 45, fill: "#10B981" },
  { resource: "Storage", usage: 78, fill: "#F59E0B" },
  { resource: "Network", usage: 32, fill: "#EF4444" },
];

const chartConfig = {
  usage: {
    label: "Usage %",
  },
  CPU: {
    label: "CPU",
    color: "#3B82F6",
  },
  Memory: {
    label: "Memory",
    color: "#10B981",
  },
  Storage: {
    label: "Storage",
    color: "#F59E0B",
  },
  Network: {
    label: "Network",
    color: "#EF4444",
  },
} satisfies ChartConfig;

const SystemPerformance = () => {
  const totalUsage = data.reduce((acc, curr) => acc + curr.usage, 0);
  const averageUsage = Math.round(totalUsage / data.length);

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">System Performance</CardTitle>
        <CardDescription className="text-gray-600">Resource utilization overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Donut Chart */}
          <div className="flex items-center justify-center">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[150px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={data}
                  dataKey="usage"
                  nameKey="resource"
                  innerRadius={40}
                  strokeWidth={5}
                >
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
                              className="fill-gray-700 text-xl font-bold"
                            >
                              {averageUsage}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 16}
                              className="fill-gray-600 text-xs"
                            >
                              Avg
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          {/* Resource Stats */}
          <div className="space-y-3">
            {data.map((item, index) => {
              const icons = [Cpu, HardDrive, HardDrive, Wifi];
              const IconComponent = icons[index];
              return (
                <div key={item.resource} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <IconComponent className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{item.resource}</span>
                      <span className="text-sm font-bold text-gray-800">{item.usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${item.usage}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-gray-600">
          System health monitoring <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-gray-500 leading-none">
          Real-time resource utilization metrics
        </div>
      </CardFooter>
    </Card>
  );
};

export default SystemPerformance;
