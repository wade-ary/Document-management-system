import type { Metadata } from "next";
import "./globals.css";
import { NextUIProvider } from "@nextui-org/react";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import NavbarComponent from "@/components/Navbar";
import { ClerkProvider } from "@clerk/nextjs";
// import VoiceWidget from "@/components/VoiceActivation";
import { AppProvider, PathProvider } from "./AppContext";
// import AudioWidget from "@/components/AudioWidget";
// import ChatUI from "@/components/AgentChat";

export const metadata: Metadata = {
  title: "EDU DATA",
  description: "Created by DODS SIH 2025 Team",
  icons: {
    icon: "https://fonts.googleapis.com/icon?family=Material+Icons",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/directory"
      afterSignUpUrl="/directory"
    >
      <html lang="en">
        <head>
          <link
            href="https://fonts.googleapis.com/icon?family=Material+Icons"
            rel="stylesheet"
          />
        </head>
        <body className={`font-poppins antialiased`}>
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <NextUIProvider>
            <AppProvider>
              <PathProvider>
                <div className="relative w-full h-full">
                  <div className="w-full fixed z-50">
                    <NavbarComponent />
                    {/* <AudioWidget /> */}

                    {/* <VoiceWidget /> */}
                  </div>

                  {/* offset content so fixed navbar does not overlap top of pages */}
                  <main className="pt-16">{children}</main>

                </div>
              </PathProvider>
            </AppProvider>
          </NextUIProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
