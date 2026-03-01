import React, { useEffect, useState } from "react";

const API_GET_CLIENT_DETAILS = "http://127.0.0.1:8000/get-client-details";

const ClientDetails = () => {
  const [clientDetails, setClientDetails] = useState<{
    company_name: string;
    contact_email: string;
    redirect_uri: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        const response = await fetch(API_GET_CLIENT_DETAILS, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch client details.");
        }

        const data = await response.json();
        setClientDetails(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error fetching client details:", err.message);
        setError(err.message);
      }
    };

    fetchClientDetails();
  }, []);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!clientDetails) {
    return <div>Loading client details...</div>;
  }

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">Client Details</h2>
      <div className="mb-2">
        <strong>Company Name:</strong> {clientDetails.company_name}
      </div>
      <div className="mb-2">
        <strong>Contact Email:</strong> {clientDetails.contact_email}
      </div>
      <div>
        <strong>Redirect URI:</strong> {clientDetails.redirect_uri}
      </div>
    </div>
  );
};

export default ClientDetails;
