/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle, Key } from "lucide-react";
import { toast } from "react-toastify";
import { parse } from "@/lib/ParseDate";
import { API_ENDPOINTS } from "@/config/api";

// Define your Action type
interface ApiAccessRequest {
  client_id: string;
  company_name: string;
  contact_email: string;
  redirect_uri: string;
  approval_status: string;
  timestamp: string;
}

export default function ApiAccessRequestsTable() {
  const API_FETCH_REQUESTS = API_ENDPOINTS.ADMIN.API_ACCESS_REQUESTS; // Updated to fetch all requests
  const API_APPROVE_ACCESS = API_ENDPOINTS.ADMIN.APPROVE_API_ACCESS;
  const API_REJECT_ACCESS = API_ENDPOINTS.ADMIN.REJECT_API_ACCESS;

  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<ApiAccessRequest[]>([]);

  // Fetch all API access requests
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_FETCH_REQUESTS, {
        method: "GET",
      });
      const result = await response.json();
      console.log("API Response:", result); // Log the response to inspect

      // If the response is an array of requests
      const fetched_requests: ApiAccessRequest[] = result.map((request: any) => ({
        client_id: request.client_id,
        company_name: request.company_name,
        contact_email: request.contact_email,
        redirect_uri: request.redirect_uri,
        approval_status: request.approval_status || "pending", // Default to "pending" if not present
        timestamp: request.created_at,  // Using `created_at` instead of `timestamp`
      }));

      setRequests(fetched_requests);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve API access
  const approveApiAccess = async (client_id: string, admin_id: string) => {
    return toast.promise(
      (async () => {
        setIsLoading(true);
        try {
          const response = await fetch(API_APPROVE_ACCESS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id, admin_id }),
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Failed to approve API access");
          }

          // Refresh requests after approval
          await fetchRequests();
          return result.message;
        } catch (error: any) {
          console.error("Error approving API access:", error);
          throw error.message || "Failed to approve API access";
        } finally {
          setIsLoading(false);
        }
      })(),
      {
        pending: "Approving API access request...",
        success: {
          render({ data }: { data: string }) {
            return data;
          },
        },
        error: {
          render({ data }: { data: string }) {
            return data;
          },
        },
      }
    );
  };

  // Reject API access
  const rejectApiAccess = async (client_id: string, admin_id: string) => {
    return toast.promise(
      (async () => {
        setIsLoading(true);
        try {
          const response = await fetch(API_REJECT_ACCESS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id, admin_id, reason: "Rejected by admin" }),
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Failed to reject API access");
          }

          // Refresh requests after rejection
          await fetchRequests();
          return result.message;
        } catch (error: any) {
          console.error("Error rejecting API access:", error);
          throw error.message || "Failed to reject API access";
        } finally {
          setIsLoading(false);
        }
      })(),
      {
        pending: "Rejecting API access request...",
        success: {
          render({ data }: { data: string }) {
            return data;
          },
        },
        error: {
          render({ data }: { data: string }) {
            return data;
          },
        },
      }
    );
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-600" />
          API Access Requests
        </CardTitle>
        <CardDescription className="text-gray-600">
          Review and manage API access requests from external applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoading ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-700">Company Name</TableHead>
                  <TableHead className="text-gray-700">Contact Email</TableHead>
                  <TableHead className="text-gray-700">Redirect URI</TableHead>
                  <TableHead className="text-gray-700">Request Timestamp</TableHead>
                  <TableHead className="text-gray-700">Status</TableHead>
                  <TableHead className="text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-800">{item.company_name}</TableCell>
                    <TableCell className="text-gray-700">{item.contact_email}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{item.redirect_uri}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{parse(item.timestamp)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.approval_status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : item.approval_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.approval_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveApiAccess(item.client_id, "admin_placeholder")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => rejectApiAccess(item.client_id, "admin_placeholder")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading Requests...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
