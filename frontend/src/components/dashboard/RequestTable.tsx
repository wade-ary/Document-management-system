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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
import { Action } from "@/app/types";
import { toast } from "react-toastify";
import { parse } from "@/lib/ParseDate";
import FileViewer from "../FileViewer";
import { API_ENDPOINTS } from "@/config/api";

// const tableData = [
//     {
//       userName: "John Doe",
//       fileName: "Document.pdf",
//       fileAction: "Upload",
//       requestDatetime: "2024-11-10 12:30:00",
//     },
//     {
//       userName: "Jane Smith",
//       fileName: "Image.png",
//       fileAction: "Delete",
//       requestDatetime: "2024-11-11 14:45:00", 
//     },
//     {
//       userName: "Robert Brown",
//       fileName: "Presentation.pptx",
//       fileAction: "Upload",
//       requestDatetime: "2024-11-11 09:10:00", 
//     },
//     {
//       userName: "Emily Davis",
//       fileName: "Report.docx",
//       fileAction: "Delete",
//       requestDatetime: "2024-11-10 16:00:00", 
//     },
//     {
//       userName: "Michael Johnson",
//       fileName: "Spreadsheet.xlsx",
//       fileAction: "Upload",
//       requestDatetime: "2024-11-09 18:25:00", 
//     },
//   ];



export default function RequestTable({ file } : any) {

  const API_FETCH_ACTIONS = API_ENDPOINTS.ADMIN.ACTIONS;
  const API_APPROVE_UPLOAD = API_ENDPOINTS.ADMIN.APPROVE_UPLOAD;
  const API_REJECT_UPLOAD = API_ENDPOINTS.ADMIN.REJECT_UPLOAD;
  const API_APPROVE_DELETE = API_ENDPOINTS.ADMIN.APPROVE_DELETE;
  const API_REJECT_DELETE = API_ENDPOINTS.ADMIN.REJECT_DELETE;
  const API_REDACT_FILE = API_ENDPOINTS.REDACT;

  const [isOpen, setIsOpen] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [isRedacting, setIsRedacting] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_FETCH_ACTIONS, {
        method: "GET",

      });
      const result = await response.json();
      // console.log(result);
      const fetched_actions: Action[] = result.actions.filter((action: Action) => action.status === 'pending')
      setActions(fetched_actions)
      console.log("Data fetched successfully:", fetched_actions);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadApprove = async (file_id: string, admin_id: string) => {
    return toast.promise(
      (async () => {
        setIsLoading(true);
        try {
          const response = await fetch(API_APPROVE_UPLOAD, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_id: file_id, admin_id: admin_id }),
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to approve upload');
          }

          // Refresh the table data after successful approval
          await fetchData();
          return result.message;
        } catch (error: any) {
          console.error("Error approving upload:", error);
          throw error.message || 'Failed to approve upload';
        } finally {
          setIsLoading(false);
        }
      })(),
      {
        pending: 'Approving upload request...',
        success: {
          render({ data }: { data: string }) {
            return data;
          }
        },
        error: {
          render({ data }: { data: string }) {
            return data;
          }
        }
      }
    );
  };

  const uploadReject = async (file_id: string, admin_id: string) => {
    return toast.promise(
      (async () => {
        setIsLoading(true);
        try {
          const response = await fetch(API_REJECT_UPLOAD, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_id: file_id, admin_id: admin_id, reason: "Rejected by admin" }),
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to approve upload');
          }

          // Refresh the table data after successful approval
          await fetchData();
          return result.message;
        } catch (error: any) {
          console.error("Error approving upload:", error);
          throw error.message || 'Failed to approve upload';
        } finally {
          setIsLoading(false);
        }
      })(),
      {
        pending: 'Rejecting Upload Request...',
        success: {
          render({ data }: { data: string }) {
            return data;
          }
        },
        error: {
          render({ data }: { data: string }) {
            return data;
          }
        }
      }
    );
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function deleteReject(file_id: string, user_id: string) {
    toast.promise(
      fetch(API_REJECT_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: file_id, admin_id: user_id, reason: "Rejected by admin" }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          fetchData();
          console.log("Delete Approval successful", data);
          return data.message
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
          return error.error
        }),
      {
        pending: "Rejecting Delete Request...",
        success: {
          render({ data }: { data: string }) {
            return data || `Deletion Request was Successfully Rejected`;
          }
        },
        error: {
          render({ data }: { data: Error }) {
            return data.message || "Failed to reject delete request";
          },
        }
      }
    )
  }

  function deleteApprove(file_id: string, user_id: string) {
    toast.promise(
      fetch(API_APPROVE_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: file_id, admin_id: user_id }),
      })
        .then(async(response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Network response was not ok");
          }
          return response.json();
        })
        .then(async (data) => {
          await fetchData();
          console.log("Delete request successful", data);
          return data.message
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
          return error.error
        }),
      {
        pending: "Approving delete request...",
        success: {
          render({ data }: { data: string }) {
            return data || `Deletion Request was successfully Approved `;
          }
        },
        error: {
          render({ data }: { data: Error }) {
            return data.message || "Failed to approve delete request";
          },
        }
      }

    )
  }



  interface RedactFileProps {
    file: File | null;
  }

  const redactFile = async ({ file }: RedactFileProps): Promise<void> => {
    if (!file) {
      toast.error("No file selected for redaction.");
      console.log("Error: No file selected for redaction.");
      return;
    }

    // Start redaction
    setIsRedacting(true);
    toast.info("Starting redaction... Please wait.");
    console.log("Starting redaction for file:", file.name);

    const formData = new FormData();
    formData.append("file", file); // Attach the selected file to the form data

    try {
      console.log("Sending file to redaction endpoint...");
      const response = await fetch(API_REDACT_FILE, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // If successful, retrieve the redacted PDF as a Blob
        console.log("Redaction completed successfully.");

        const redactedBlob = await response.blob();
        const url = window.URL.createObjectURL(redactedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "redacted.pdf";
        a.click();

        toast.success("Redaction completed. File downloaded.");
        console.log("Redacted file downloaded successfully.");
      } else {
        const error = await response.json();
        toast.error(error.message || "An error occurred during redaction.");
        console.log("Redaction failed. Error:", error.message);
      }
    } catch (error) {
      console.error("Error during redaction:", error);
      toast.error("Failed to redact the file. Please try again.");
      console.log("Error during redaction:", error);
    } finally {
      setIsRedacting(false);
      console.log("Redaction process finished.");
    }
  };


  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">Pending Requests</CardTitle>
        <CardDescription className="text-gray-600">
          Review and approve/reject file upload and deletion requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoading ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-700">User Name</TableHead>
                  <TableHead className="text-gray-700">File Name</TableHead>
                  <TableHead className="text-gray-700">Account Type</TableHead>
                  <TableHead className="text-gray-700">File Access</TableHead>
                  <TableHead className="text-gray-700">File Path</TableHead>
                  <TableHead className="text-gray-700">File Action</TableHead>
                  <TableHead className="text-gray-700">Request Timestamp</TableHead>
                  <TableHead className="text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((item: Action, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-800">{item.username}</TableCell>
                    <TableCell
                      className="text-blue-600 hover:text-blue-800 cursor-pointer underline"
                      onClick={() => {
                        setFilePath(item.file_path || "No Path");
                        setFileName(item.file_name);
                        setIsOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {item.file_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {item.account_type != "Government" ? item.account_type : 
                        <div className="flex flex-col gap-1">
                          <p className="font-medium">{item.account_type}</p>
                          <p className="text-xs text-gray-500">{item.department}</p>
                        </div> 
                      }
                    </TableCell>
                    <TableCell className="text-gray-700 capitalize">{item.access_to}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{item.file_path}</TableCell>
                    <TableCell className="text-gray-700 capitalize">{item.action}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{parse(item.timestamp)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            if (item.action == "upload")
                              uploadApprove(item.file_id, item.user_id);
                            else
                              deleteApprove(item.file_id, item.user_id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            if (item.action == "upload")
                              uploadReject(item.file_id, item.user_id);
                            else
                              deleteReject(item.file_id, item.user_id);
                          }}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[80vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-gray-800">Viewing: {fileName}</DialogTitle>
            <DialogDescription className="text-gray-600">
              Review the file before making a decision
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <FileViewer filePath={filePath} fileName={fileName} />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => redactFile(file)}
              disabled={isRedacting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRedacting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redacting...
                </>
              ) : (
                "Redact"
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}