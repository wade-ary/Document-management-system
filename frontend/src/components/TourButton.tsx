"use client";

import React, { useEffect, useState } from "react";
import "driver.js/dist/driver.css";
import "@/styles/driver-theme.css";

interface TourButtonProps {
  className?: string;
}

export default function TourButton({ className = "" }: TourButtonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const startTour = async () => {
    if (!isClient) return;
    
    // Dynamically import driver.js to avoid SSR issues
    const { driver } = await import("driver.js");
    
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      stagePadding: 10,
      stageRadius: 10,
      popoverClass: "driverjs-theme",
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next →",
      prevBtnText: "← Previous",
      doneBtnText: "✓ Done",
      steps: [
        {
          element: "#tour-header",
          popover: {
            title: "🏛️ Welcome to MoE Document Management",
            description:
              "This is your central hub for managing all Ministry of Education documents including policies, schemes, circulars, and regulations.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-search-input",
          popover: {
            title: "🔍 Smart Search",
            description:
              "Search through thousands of documents instantly using keywords, document names, or topics. Our AI-powered search finds the most relevant results.",
            side: "bottom" as const,
            align: "start" as const,
          },
        },
        {
          element: "#tour-search-limit",
          popover: {
            title: "📊 Result Limit",
            description:
              "Control how many results you want to see at once. Adjust this number based on your needs (1-100).",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-search-button",
          popover: {
            title: "⚡ Quick Search",
            description:
              "Click here to perform a quick search across all documents. Results are ranked by relevance.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-extensive-search",
          popover: {
            title: "🔬 Extensive Search",
            description:
              "Need more control? Use Extensive Search to filter by file type, tags, and more advanced criteria.",
            side: "bottom" as const,
            align: "end" as const,
          },
        },
        {
          element: "#tour-document-filter",
          popover: {
            title: "📁 Document Type Filter",
            description:
              "Filter documents by type - Circulars, Policies, Reports, Schemes, Notices, and more. Great for finding specific document categories.",
            side: "top" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-upload-button",
          popover: {
            title: "⬆️ Upload Documents",
            description:
              "Upload new documents to the repository. Supports PDF, Word, and other document formats with automatic AI tagging.",
            side: "bottom" as const,
            align: "start" as const,
          },
        },
        {
          element: "#tour-refresh-button",
          popover: {
            title: "🔄 Refresh Documents",
            description:
              "Click here to refresh and see the latest documents added to the repository.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-compare-button",
          popover: {
            title: "📊 Compare Documents",
            description:
              "Compare multiple documents side by side to analyze differences, find common themes, or track policy changes.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "#tour-email-filter",
          popover: {
            title: "📧 Email Documents Filter",
            description:
              "Toggle this to show only documents received via email. Useful for tracking official communications.",
            side: "bottom" as const,
            align: "end" as const,
          },
        },
        {
          element: "#tour-documents-section",
          popover: {
            title: "📚 Document Library",
            description:
              "Here you'll find all your documents organized by categories - your uploads, recent documents, and the complete repository. Click on any document to view details, add tags, or perform actions.",
            side: "top" as const,
            align: "center" as const,
          },
        },
      ],
    });

    driverObj.drive();
  };

  if (!isClient) return null;

  return (
    <button
      onClick={startTour}
      className={`tour-trigger-button ${className}`}
      aria-label="Start platform tour"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
      Take a Tour
    </button>
  );
}
