"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ENDPOINTS } from "@/config/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Activity } from "lucide-react";
import { Action } from "@/app/types";
// import { parse } from "@/lib/ParseDate";
// import FileViewer from "../FileViewer";
  

export default function ActivityTable() {

  // use API_ENDPOINTS.ADMIN.ACTIONS directly inside effects to avoid hook dependency issues
  const [isLoading, setIsLoading] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
  const response = await fetch(API_ENDPOINTS.ADMIN.ACTIONS, {
          method: "GET",
        });
        const result = await response.json();
        const fetched_actions: Action[] = result.actions.filter((action: Action) => action.status != "pending");
        setActions(fetched_actions);
        console.log("Data fetched successfully:", fetched_actions);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Activity Log
        </CardTitle>
        <CardDescription className="text-gray-600">
          Recent file actions and system activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoading && actions.length > 0 ? (  
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-700">Sr No.</TableHead>
                  <TableHead className="text-gray-700">Action</TableHead>
                  <TableHead className="text-gray-700">Deadline</TableHead>
                  <TableHead className="text-gray-700">File</TableHead>
                  <TableHead className="text-gray-700">Department (Uploaded by)</TableHead>
                  <TableHead className="text-gray-700">Email Id</TableHead>
                  {/* <TableHead className="text-gray-700">Time</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((item: Action, index: number) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-800">{index+1}</TableCell>
                    <TableCell className="text-gray-700">
                      <span className="capitalize">{item.action}</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : item.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    {/* Deadline column */}
                    <TableCell className="text-gray-700">
                      {item.deadline ? (
                        (() => {
                          try {
                            const due = new Date(item.deadline as string);
                            const today = new Date();
                            // zero time portion for comparison
                            const tzToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
                            const tzDue = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
                            const diffMs = tzDue.getTime() - tzToday.getTime();
                            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                            // overdue
                            if (diffDays < 0) {
                              return (
                                <span className="inline-flex items-center gap-2 text-xs font-medium text-red-700">
                                  <span className="w-2 h-2 rounded-full bg-red-600" aria-hidden />
                                  {due.toLocaleDateString()}
                                  <span className="ml-2 text-red-600">(Overdue)</span>
                                </span>
                              );
                            }

                            // urgent: 2 days or less
                            if (diffDays <= 2) {
                              return (
                                <span className="inline-flex items-center gap-2 text-xs font-medium text-orange-800">
                                  <span className="w-2 h-2 rounded-full bg-orange-500" aria-hidden />
                                  {due.toLocaleDateString()}
                                  <span className="ml-2 text-orange-600">(Urgent)</span>
                                </span>
                              );
                            }

                            // normal future
                            return (
                              <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-gray-300" aria-hidden />
                                {due.toLocaleDateString()}
                              </span>
                            );
                          } catch {
                            return <span className="text-sm text-gray-600">—</span>;
                          }
                        })()
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 font-medium">{item.file_name}</TableCell>
                    <TableCell className="text-gray-800">
                      {item.uploaded_by_department
                        ? item.uploaded_by_department
                        : (item.account_type || item.username) || "-"}
                    </TableCell>
                    <TableCell className="text-gray-600">{item.uploader_email || item.email || "-"}</TableCell>
                    {/* <TableCell className="text-gray-600 text-sm">{parse(item.timestamp)}</TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading Activities...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}