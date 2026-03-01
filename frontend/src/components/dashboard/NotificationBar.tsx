"use client";

import { CheckCircle, Clock, AlertCircle, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const notifications = [
  { 
    id: 1,
    status: "Request for Document Upload", 
    icon: Upload,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    completed: false
  },
  { 
    id: 2,
    status: "Document Upload Failed", 
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    completed: false
  },
  { 
    id: 3,
    status: "Document Upload in Process", 
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    completed: false
  },
  { 
    id: 4,
    status: "Document Upload Successful", 
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    completed: true
  },
];

const NotificationBar = () => {
  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader>
        <CardTitle className="text-gray-800">System Notifications</CardTitle>
        <CardDescription className="text-gray-600">Current system status and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notif) => {
            const IconComponent = notif.icon;
            return (
              <div
                key={notif.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${notif.bgColor} ${notif.borderColor} ${
                  notif.completed ? 'opacity-75' : ''
                }`}
              >
                <div className={`flex-shrink-0 ${notif.color}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notif.color} ${
                    notif.completed ? 'line-through' : ''
                  }`}>
                    {notif.status}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {notif.completed ? 'Completed' : 'In Progress'}
                  </p>
                </div>
                {notif.completed && (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationBar;
  