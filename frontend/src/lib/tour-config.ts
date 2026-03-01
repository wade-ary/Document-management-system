import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

// Tour steps configuration for the Directory page
export const directoryTourSteps: DriveStep[] = [
  {
    element: "#tour-header",
    popover: {
      title: "🏛️ Welcome to MoE Document Management",
      description:
        "This is your central hub for managing all Ministry of Education documents including policies, schemes, circulars, and regulations.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-search-input",
    popover: {
      title: "🔍 Smart Search",
      description:
        "Search through thousands of documents instantly using keywords, document names, or topics. Our AI-powered search finds the most relevant results.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-search-limit",
    popover: {
      title: "📊 Result Limit",
      description:
        "Control how many results you want to see at once. Adjust this number based on your needs (1-100).",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-search-button",
    popover: {
      title: "⚡ Quick Search",
      description:
        "Click here to perform a quick search across all documents. Results are ranked by relevance.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-extensive-search",
    popover: {
      title: "🔬 Extensive Search",
      description:
        "Need more control? Use Extensive Search to filter by file type, tags, and more advanced criteria.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#tour-document-filter",
    popover: {
      title: "📁 Document Type Filter",
      description:
        "Filter documents by type - Circulars, Policies, Reports, Schemes, Notices, and more. Great for finding specific document categories.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#tour-upload-button",
    popover: {
      title: "⬆️ Upload Documents",
      description:
        "Upload new documents to the repository. Supports PDF, Word, and other document formats with automatic AI tagging.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-refresh-button",
    popover: {
      title: "🔄 Refresh Documents",
      description:
        "Click here to refresh and see the latest documents added to the repository.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-compare-button",
    popover: {
      title: "📊 Compare Documents",
      description:
        "Compare multiple documents side by side to analyze differences, find common themes, or track policy changes.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-email-filter",
    popover: {
      title: "📧 Email Documents Filter",
      description:
        "Toggle this to show only documents received via email. Useful for tracking official communications.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#tour-documents-section",
    popover: {
      title: "📚 Document Library",
      description:
        "Here you'll find all your documents organized by categories - your uploads, recent documents, and the complete repository. Click on any document to view details, add tags, or perform actions.",
      side: "top",
      align: "center",
    },
  },
];

// Create and configure the driver instance
export const createDirectoryTour = () => {
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
    steps: directoryTourSteps,
  });

  return driverObj;
};

// Check if user has seen the tour
export const hasSeenTour = (tourName: string): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`tour_${tourName}_completed`) === "true";
};

// Mark tour as completed
export const markTourComplete = (tourName: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`tour_${tourName}_completed`, "true");
};

// Reset tour (for testing or if user wants to see it again)
export const resetTour = (tourName: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`tour_${tourName}_completed`);
};
