"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useClerk, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
// Use public folder path for Next.js static images
import UserMenuDropdown from "./UserMenuDropdown";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
// import useMuteStore from "@/store/muteStore";

// Page descriptions for screen reader navigation
// const PAGE_DESCRIPTIONS = {
//   "/": "Home page. Overview of EDU DATA application.",
//   "/directory": "Directory. List of Files and Folders. Command to use for voice: 1. upload document, 2.open filename, 3.Search document",
//   "/dashboard": "Dashboard. Admin Dashboard for managing users and files.",
//   "/external": "External Resources. Additional links and external information."
// };

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

// Utility function to speak text for screen readers
// const speakText = (text: string, mute: boolean) => {
//   if (typeof window !== 'undefined' && window.speechSynthesis && !mute) {
//     const utterance = new SpeechSynthesisUtterance(text);
//     window.speechSynthesis.speak(utterance);
//   }
// };

function NavbarComponent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  // const { mute, toggleMute } = useMuteStore(); // State to track if speech is muted
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const navRef = useRef(null);

  const menuItems = useMemo(() => ["Query", "Compliance"], []);
  const menuPaths = useMemo(() => ["/", "/compliance"], []);

  useEffect(() => {
    // Add the Google Translate script dynamically
    const addGoogleTranslateScript = () => {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
  
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,ta,te,ml,kn,mr,bn,gu,pa,or,as,ur,sd,si", // All Indian languages and English
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          },
          "google_translate_element"
        );
      };
    }
    addGoogleTranslateScript();
  },[])

  // Announce current page for screen readers
  // const announceCurrentPage = () => {
  //   const description = PAGE_DESCRIPTIONS[pathname as keyof typeof PAGE_DESCRIPTIONS] || "Current page";
  //   speakText(description, mute);
  // };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void; }) => {
      // Check if the focus is on the navigation menu
      if (document.activeElement === navRef.current) {
        if (e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
          e.preventDefault();
  
          // Determine new tab index
          let newIndex = currentTabIndex;
          if (e.key === "ArrowRight") {
            newIndex = (newIndex + 1) % menuItems.length;
          } else if (e.key === "ArrowLeft") {
            newIndex = (newIndex - 1 + menuItems.length) % menuItems.length;
          }
  
          setCurrentTabIndex(newIndex);
  
          // Announce the new tab for screen readers
          // speakText(`Navigated to ${menuItems[newIndex]} tab`, mute);
        }
  
        // Handle Enter key to select the current tab
        if (e.key === "Enter") {
          router.push(menuPaths[currentTabIndex]);
          // announceCurrentPage();
        }
      }
    };
  
    // Add event listener
    window.addEventListener("keydown", handleKeyDown);
  
    // Clean up event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTabIndex, router, menuPaths, menuItems.length]);

  // Announce page on initial load
  // useEffect(() => {
  //   // announceCurrentPage();
  // }, [pathname, mute]);

  return (
    <nav 
      ref={navRef}
      className="bg-white shadow-md fixed top-0 left-0 w-full z-50"
      tabIndex={0}
      aria-label="Main Navigation"
      role="navigation"
    >
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Brand Logo (Updated) */}
          <div className="flex items-center ml-[8%] space-x-3">
            <button onClick={() => router.push('/')} className="flex items-center">
              <Image src="/image-removebg-preview.png" alt="EduData Insight Logo" width={48} height={48} />
              <span className="font-bold ml-2 text-xl text-blue-700 flex items-center">EDU DATA</span>
            </button>
          </div>

          {/* Desktop Menu */}
          <div
            className="hidden sm:flex sm:items-center sm:space-x-8"
            aria-label="Desktop Navigation Menu"
          >
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={menuPaths[index]}
                className={`text-sm font-medium hover:text-blue-600 ${
                  pathname === menuPaths[index] ? "text-blue-600 !font-semibold" : "text-gray-700"
                }`}
                aria-current={pathname === menuPaths[index] ? "page" : undefined}
                aria-label={`Navigate to ${item} page`}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Mute Button */}
            {/* <Button
              onClick={() => toggleMute()}
              variant="flat"
              color="warning"
              aria-label={mute ? "Unmute Voice" : "Mute Voice"}
            >
              {mute ? "Unmute" : "Mute"}
            </Button> */}

            {!isSignedIn ? (
              <>
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  aria-label="Login to EduData Insight"
                >
                  <Link href="/sign-in">
                    Login
                  </Link>
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  aria-label="Create a new account"
                >
                  <Link href="/sign-up">
                    Sign Up
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="flex justify-center items-center space-x-4">
                  <UserMenuDropdown />
                </div>
              </>
            )}
            {/* Hidden Google Translate element - required for translation functionality */}
            <div
              id="google_translate_element"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={menuPaths[index]}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavbarComponent
