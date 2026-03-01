/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Select, SelectItem } from "@nextui-org/react";
import { Button } from "@nextui-org/react";
import { Card, CardBody, CardFooter } from "@nextui-org/react";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "@/config/api";
// import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignUp() {
  const accTypes = [
    "Admin",
    "Manager",
    "Staff",
    "Ministry of Education",
    "Ministry of Finance",
    "Ministry of Health & Family Welfare",
    "Ministry of Agriculture & Farmers Welfare",
    "Ministry of Defence",
    "Ministry of Home Affairs",
    "Ministry of External Affairs",
    "Ministry of Commerce & Industry",
    "Ministry of Rural Development",
    "Ministry of Environment, Forest & Climate Change",
    "Ministry of Road Transport & Highways",
    "Ministry of Railways",
    "Ministry of Labour & Employment",
    "Ministry of Women & Child Development",
    "Ministry of Science & Technology",
    "Ministry of Information & Broadcasting"
  ];

  const { isLoaded, signUp, setActive } = useSignUp();
  const [username, setUsername] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [accType, setAccType] = useState(accTypes[0]);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  if (!isLoaded) {
    return null;
  }

  const handleAccountTypeChange = (e: any) => {
    setAccType(e.target.value);
    console.log("Selected Account Type", accType);
  };

  async function mongoSignUp(user_id: string, username: string, emailAddress: string, password: string, accType: string) {
    const res = await fetch(API_ENDPOINTS.SIGNUP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user_id,
        username: username,
        email: emailAddress,
        password: password,
        accountType: accType,
      }),
    });

    if (res.ok) {
      console.log("User created in MongoDB");
    } else {
      console.error("Failed to create user in MongoDB");
    }
  }

  async function clickHandler(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) {
      return;
    }

    try {
      await signUp.create({
        username,
        emailAddress,
        password,
        unsafeMetadata: {
          accountType: accType,
        },
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
      setError("")
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors[0].message);
    }
  }

  async function onPressVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) {
      return;
    }

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status !== "complete") {
        console.error("Sign up not complete");
        console.log(JSON.stringify(completeSignUp, null, 2));
      }

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        console.log(completeSignUp);
        toast.success("Account created successfully");
        router.push("/");
        await mongoSignUp(completeSignUp.createdUserId ?? "", username, emailAddress, password, accType);
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors[0].message);
      toast.error("Failed to create account");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md px-6 py-5">
        <CardBody>
          <h3 className="text-2xl font-bold text-center mb-6">
            Create an Account
          </h3>
          {!pendingVerification ? (
            <form className="flex flex-col gap-4">
              <Input
                type="text"
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

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

              <Select
                label="Select Account Type"
                className="w-full"
                onChange={handleAccountTypeChange}
                required
              >
                {accTypes.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </Select>

              {error && (
                <p className="w-full text-center text-red-500 text-sm">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={onPressVerify} className="flex flex-col gap-4">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter verification code"
                required
              />

              {error && (
                <p className="w-full text-center text-red-500 text-sm">
                  {error}
                </p>
              )}

              <Link
                href="/sign-in"
                className="font-medium text-blue-500 hover:underline"
              >
                <Button type="submit" className="w-full text-white bg-blue-500">
                  Verify Email
                </Button>
              </Link>
            </form>
          )}
        </CardBody>
        <CardFooter className="flex flex-col gap-4 justify-center">
          {!pendingVerification &&
            <Button
              onClick={clickHandler}
              className="w-full text-white font-semibold bg-blue-500"
            >
              Sign Up
            </Button>
          }
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-blue-500 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// "use client";

// import { SignUp } from "@clerk/nextjs";
// // import { Card } from "@nextui-org/react";

// const SignUpPage = () => {
//   return (
//     <div className="flex justify-center items-center h-screen w-full pt-[5%]">
//         <SignUp
//           path="/sign-up"
//           routing="path"
//           signInUrl="/sign-in"
//           // unsafeMetadata={
//           //   {
//           //     department: department,
//           //   }
//           // }
//         />
//     </div>
//   );
// };

// export default SignUpPage;
