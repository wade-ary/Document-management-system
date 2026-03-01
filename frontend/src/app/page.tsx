/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import LandingPage from "@/components/HomePage/LandingPage";
import { usePathContext } from "./AppContext";
import { useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { API_ENDPOINTS } from "@/config/api";
// import { TabsDemo } from "@/components/HomePageUpdated";
// import { motion } from "framer-motion";
// import { AuroraBackground } from "../components/ui/aurora-background";

export default function Home() {
  const {viewName, setViewName, filesContext, setFilesContext } = usePathContext();
  async function postData(url: string, data = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  
    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }
  
    return res.json();
  }
  
  const { user } = useUser();

  const onShowFiles = useCallback(() => {
    // Don't call until Clerk user is available (backend needs user_id)
    if (!user?.id) return;
    postData(API_ENDPOINTS.LIST_DIR, { dir: "~/Sandbox", user_id: user.id }).then((data) => {
      console.log(data);
      setFilesContext(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((item: any) => ({
          fileId: item.file_id,
          fileName: item.name,
          isDirectory: item.name.endsWith("/"),
          filePath: item.path,
          tags: item.tags,
          userId: item.user_id,
        }))
      );
    });
  }, [user?.id, setFilesContext]);
  useEffect(() => {
    // try to load files once user is available
    if (user?.id) onShowFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id]);

  return (
    <>
      <div>
        {/* <TabsDemo/> */}
        <LandingPage />
        <footer className="mb-4 text-center text-lg">
  © 2025 EduData Insight - AI for the Ministry of Education. All rights reserved.
      </footer>
      </div>
    </>
  );
}
