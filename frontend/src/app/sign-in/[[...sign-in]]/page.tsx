/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@nextui-org/react";
import { Button } from "@nextui-org/react";
import { Card, CardBody, CardFooter } from "@nextui-org/react";
import { toast } from "react-toastify";
// import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("av.rajpurkarr@gmail.com");
  const [password, setPassword] = useState("zeno181527");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if user was redirected from a protected route
  const redirectUrl = searchParams.get('redirect_url');
  const wasRedirected = !!redirectUrl;

  // Demo credentials
  const DEMO_EMAIL = "av.rajpurkarr@gmail.com";
  const DEMO_PASSWORD = "zeno181527";

  // Auto-fill demo credentials on component mount
  useEffect(() => {
    setEmailAddress(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    
    // Show message if user was redirected from protected route (only once per session)
    if (wasRedirected && typeof window !== 'undefined') {
      const hasShownToast = sessionStorage.getItem('redirect-toast-shown');
      if (!hasShownToast) {
        toast.info("Please login to access that page", {
          position: "top-center",
          autoClose: 5000,
        });
        sessionStorage.setItem('redirect-toast-shown', 'true');
        
        // Clear the flag after successful login or page refresh
        const clearFlag = () => sessionStorage.removeItem('redirect-toast-shown');
        window.addEventListener('beforeunload', clearFlag);
        
        return () => window.removeEventListener('beforeunload', clearFlag);
      }
    }
  }, [wasRedirected, DEMO_EMAIL, DEMO_PASSWORD]);

  if (!isLoaded) {
    return null;
  }

  async function clickHandler(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) {
      return;
    }

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        console.log(result);
        toast.success("Logged in successfully");
        
        // Clear the redirect toast flag
        sessionStorage.removeItem('redirect-toast-shown');
        
        // Redirect to original URL if available, otherwise go to home
        const destination = redirectUrl || "/";
        router.push(destination);
      } else {
        console.error(JSON.stringify(result, null, 2));
        toast.error("Failed to log in");
      }
    } catch (err: any) {
      console.error("error", err.errors[0].message);
      setError(err.errors[0].message);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md px-8 py-6">
        <CardBody>
          <p className="text-2xl font-bold text-center mb-4">
            Sign In to EDU DATA
          </p>

          {/* Login Required Message */}
          {wasRedirected && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-amber-600">🔒</div>
                <p className="text-sm font-semibold text-amber-800">Login Required</p>
              </div>
              <p className="text-xs text-amber-700">
                Please login before accessing that page. Use the demo credentials below to continue.
              </p>
            </div>
          )}

          {/* Demo Account Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm font-semibold text-blue-800">Demo Account</p>
            </div>
            <p className="text-xs text-blue-600 mb-2">
              Use the pre-filled credentials below for demo purposes:
            </p>
            <div className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1 font-mono">
              <div>📧 {DEMO_EMAIL}</div>
              <div>🔐 {DEMO_PASSWORD}</div>
            </div>
          </div>

          <form className="flex flex-col gap-4">
            <Input
              type="email"
              id="email"
              label="Email Address"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              required
            />

            <Input
              type="password"
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="w-full text-center text-red-500 text-sm">{error}</p>
            )}

            {/* Quick Demo Login Button */}
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={() => {
                setEmailAddress(DEMO_EMAIL);
                setPassword(DEMO_PASSWORD);
                toast.info("Demo credentials loaded! Click Sign In to continue.");
              }}
              className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              🚀 Use Demo Credentials
            </Button>
          </form>
        </CardBody>
        <CardFooter className="flex flex-col gap-4 justify-center">
          <Button
            type="submit"
            onClick={clickHandler}
            className="w-full text-white font-semibold bg-blue-500"
          >
            Sign In
          </Button>
          <p className="text-sm text-muted-foreground">
            Dont have an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-blue-500 hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};


// "use client";

// import { SignIn } from "@clerk/nextjs";
// // import { Card } from "@nextui-org/react";

// const SignInPage = () => {
//   return (
//     <div className="flex justify-center items-center h-screen w-full pt-[5%]">
//         <SignIn
//           path="/sign-in"
//           routing="path"
//           signUpUrl="/sign-up"
//         />
//     </div>
//   );
// };

// export default SignInPage;
