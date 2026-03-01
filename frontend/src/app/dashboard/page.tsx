"use client";
import { Protect } from '@clerk/nextjs'
import React from "react";
import { Tabs, Tab, Card } from "@nextui-org/react";
import ActivityTable from "@/components/dashboard/ActivityTable";
import RequestTable from "@/components/dashboard/RequestTable";
import Metrics from "@/components/dashboard/Metrics";
import DataDash from "@/components/dashboard/DataDash";
import ApiAccessRequestsTable from '@/components/dashboard/API_table';
import ClientDetails from '@/components/ClientDetails';
import { BarChart3 } from 'lucide-react';



function Page() {

  return (
    <Protect
      // condition={(has) => has({ role: 'org:admin' }) || has({ role: 'org:billing_manager' })}
    >
      
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Enhanced Grid Pattern Background - Matching Home Page */}
      <div className="absolute inset-0 bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>

      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-slate-100/60 pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col pt-24 px-4 sm:px-6 lg:px-8 py-6 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div 
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 relative overflow-hidden"
            style={{
              backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px'
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Admin Dashboard</h1>
              </div>
              <p className="text-xl text-slate-600">Manage and monitor your institution&apos;s data and activities</p>
            </div>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div 
            className="p-6 relative"
            style={{
              backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.02) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px'
            }}
          >
            <Metrics/>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div 
            className="p-6 relative"
            style={{
              backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.02) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px'
            }}
          >
            <Tabs 
              className="w-full" 
              classNames={{
                tabList: "gap-4 w-full relative rounded-xl bg-slate-100 p-2",
                cursor: "bg-white shadow-lg rounded-lg",
                tab: "px-6 py-3 h-12 font-semibold transition-all duration-200",
                tabContent: "group-data-[selected=true]:text-blue-600"
              }}
            >
              <Tab key="Data" title="Data Analysis">
                <div className="rounded-2xl overflow-hidden mt-6 shadow-md border border-slate-200">
                  <DataDash/>
                </div>
              </Tab>
              
              <Tab key="Activity" title="Activity List">
                <Card className="mt-6 shadow-md border border-slate-200 rounded-2xl">
                    <ActivityTable />
                </Card>
              </Tab>
              
              <Tab key="Document Approval" title="Document Request">
                <Card className="mt-6 shadow-md border border-slate-200 rounded-2xl">
                    <RequestTable />
                </Card>
              </Tab>
              
              <Tab key="API Access Approval" title="API Access">
                <Card className="mt-6 shadow-md border border-slate-200 rounded-2xl">
                    <ApiAccessRequestsTable />
                </Card>
              </Tab>
              
              <Tab key="External Details" title="External Details">
                <Card className="mt-6 shadow-md border border-slate-200 rounded-2xl">
                    <ClientDetails/>
                </Card>
              </Tab>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-lg text-slate-600/80 w-full">
          © 2025 EduData Insight - AI for the Ministry of Education. All rights reserved.
        </footer>
      </div>
    </div>
    </Protect>
  );
}

export default Page;
