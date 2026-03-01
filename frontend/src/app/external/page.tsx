"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, CheckCircle, AlertCircle, Key } from "lucide-react";

const ExternalPage = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    contactEmail: "",
    redirectUri: "",
  });

  const [clientId, setClientId] = useState("");
  const [credentials, setCredentials] = useState<null | { client_id: string; client_secret: string }>(null);
  const [status, setStatus] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus(null);

    try {
      const res = await fetch("http://localhost:5000/external/register_app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: formData.companyName,
          contact_email: formData.contactEmail,
          redirect_uri: formData.redirectUri,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to register. Please check your inputs.");
      }

      const data = await res.json();
      setClientId(data.client_id);
      setStatus("Your request has been submitted and is pending approval.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred. Please try again.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!clientId) {
      setError("Please provide a valid Client ID.");
      return;
    }

    setLoading(true);
    setError("");
    setCredentials(null);

    try {
      const res = await fetch(`http://localhost:5000/external/api_access/details?client_id=${clientId}`);

      if (!res.ok) {
        if (res.status === 403) {
          setStatus("Your request is not yet approved.");
        } else {
          throw new Error("Failed to fetch the status. Please try again.");
        }
        return;
      }

      const data = await res.json();
      setCredentials(data);
      setStatus(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred. Please try again.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy client_id to clipboard
  const copyClientIdToClipboard = () => {
    if (clientId) {
      navigator.clipboard.writeText(clientId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy client ID: ", err);
        });
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mt-20">
        <Card className="border-gray-200 bg-white shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Key className="h-6 w-6 text-blue-600" />
              Apply for API Access
            </CardTitle>
            <CardDescription className="text-gray-600">
              Request access to our document management API for external applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {credentials ? (
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">API Credentials Generated</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Client ID</p>
                      <p className="text-sm text-gray-600 font-mono">{credentials.client_id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyClientIdToClipboard}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-white border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-gray-700">Client Secret</p>
                    <p className="text-sm text-gray-600 font-mono">{credentials.client_secret}</p>
                  </div>
                </div>
                <p className="text-sm text-green-700 mt-4">
                  Please save these credentials securely. The client secret will not be shown again.
                </p>
              </div>
            ) : (
              <>
                {status && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-yellow-800">{status}</p>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      id="contactEmail"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your contact email"
                    />
                  </div>

                  <div>
                    <label htmlFor="redirectUri" className="block text-sm font-medium text-gray-700 mb-2">
                      Redirect URI
                    </label>
                    <input
                      type="url"
                      id="redirectUri"
                      name="redirectUri"
                      value={formData.redirectUri}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://your-app.com/callback"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </form>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Check Request Status</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                        Client ID
                      </label>
                      <input
                        type="text"
                        id="clientId"
                        name="clientId"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your client ID"
                      />
                    </div>
                    <Button
                      onClick={handleCheckStatus}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "Check Status"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExternalPage;
