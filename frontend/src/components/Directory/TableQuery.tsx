/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */







import React, { useState, useRef, useEffect } from "react";
import { Chart, registerables } from "chart.js";
import FileViewer from "../FileViewer";

Chart.register(...registerables);

interface TableQueryProps {
  folder: string;
}

const TableQuery: React.FC<TableQueryProps> = ({ folder }) => {
  const [keyValuePairs, setKeyValuePairs] = useState<Record<string, string>>({});
  const [key, setKey] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [graphData, setGraphData] = useState<any>(null);
  const barChartRef = useRef<Chart | null>(null);
  const pieChartRef = useRef<Chart | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ filePath: string; fileName: string } | null>(null);

  const handleAddPair = () => {
    if (!key.trim() || !value.trim()) {
      alert("Key and value cannot be empty!");
      return;
    }
    setKeyValuePairs((prev) => ({ ...prev, [key]: value }));
    setKey("");
    setValue("");
  };

  const handleFileClick = (fileName: string) => {
    const filePath = `${folder}`;
    setSelectedFile({ filePath, fileName });
  };

  const closeFileViewer = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (Object.keys(keyValuePairs).length === 0) {
      alert("Please add at least one key-value pair.");
      return;
    }

    const payload = {
      folder,
      schema: keyValuePairs,
    };

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:5000/kie-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server Error: ${res.statusText}`);
      }

      const responseData = await res.json();
      console.log("Response:", responseData);
      setData(responseData);
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to fetch response. Check console for details.");
    } finally {
      setIsLoading(false);
      setKeyValuePairs({});
    }
  };

  const handleGenerateGraph = async () => {
    if (data.length === 0) {
      alert("No data available to generate a graph.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/generate-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: data }),
      });

      if (!res.ok) {
        throw new Error(`Graph generation failed: ${res.statusText}`);
      }

      const graphResponse = await res.json();
      console.log("Graph Data:", graphResponse);
      setGraphData(graphResponse);
    } catch (error) {
      console.error("Error generating graph:", error);
      alert("Failed to generate graph. Check console for details.");
    }
  };

  useEffect(() => {
    if (graphData) {
      renderGraph(graphData);
    }
  }, [graphData]);

  const renderGraph = (graphResponse: any) => {
    // Destroy existing charts if they exist
    if (barChartRef.current) {
      barChartRef.current.destroy();
    }
    if (pieChartRef.current) {
      pieChartRef.current.destroy();
    }

    // Create bar chart
    const barCtx = document.getElementById("barCanvas") as HTMLCanvasElement;
    if (barCtx) {
      barChartRef.current = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: graphResponse.barChart.labels,
          datasets: graphResponse.barChart.datasets,
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
          },
        },
      });
    }

    // Create pie chart
    const pieCtx = document.getElementById("pieCanvas") as HTMLCanvasElement;
    if (pieCtx) {
      pieChartRef.current = new Chart(pieCtx, {
        type: "pie",
        data: {
          labels: graphResponse.pieChart.labels,
          datasets: graphResponse.pieChart.datasets,
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
          },
        },
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `data_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "table_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="p-8 bg-gradient-to-r from-purple-50 to-purple-50 rounded-lg shadow-lg">
      <div className="flex justify-end mb-4">
        {data.length > 0 && (
          <button
            onClick={handleDownload}
            className="px-6 py-3 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all"
          >
            Download Data
          </button>
        )}
        {data.length > 0 && (
          <button
            onClick={handleGenerateGraph}
            className="px-6 py-3 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all ml-4"
          >
            Generate Graphs
          </button>
        )}
      </div>

      <h3 className="text-3xl font-semibold mb-6 text-gray-800">
        Feature-Description Pair Input for Folder: <span className="text-purple-600">{folder}</span>
      </h3>

      {/* Add Key-Value Pairs */}
      <div className="flex gap-6 mb-6">
        <input
          type="text"
          placeholder="Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="border border-gray-300 px-5 py-3 rounded-lg flex-1 shadow-md focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border border-gray-300 px-5 py-3 rounded-lg flex-1 shadow-md focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleAddPair}
          className="bg-purple-500 text-white px-8 py-3 rounded-lg hover:bg-purple-600 transition-all"
        >
          Add
        </button>
      </div>
      {/* Display Added Key-Value Pairs */}
      {Object.keys(keyValuePairs).length > 0 && (
        <div className="mb-8">
          <h4 className="text-xl font-medium text-gray-700">Current Feature-Value Pairs:</h4>
          <ul className="list-disc pl-6 space-y-3 text-gray-600">
            {Object.entries(keyValuePairs).map(([key, value]) => (
              <li key={key} className="text-sm">
                <strong className="font-semibold">{key}:</strong> {value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`w-full py-3 rounded-lg text-white ${isLoading ? "bg-gray-400" : "bg-purple-500 hover:bg-purple-600"
          } transition-all`}
      >
        {isLoading ? "Submitting..." : "Submit"}
      </button>

      {/* Display Table */}
      {data.length > 0 && (
        <div className="mt-8 overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full">
            <thead className="bg-purple-100 text-gray-700">
              <tr>
                {Object.keys(data[0]).map((header) => (
                  <th key={header} className="px-6 py-3 text-left font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="even:bg-purple-50">
                  {Object.entries(row).map(([key, value]) => (
                    <td
                      key={key}
                      className="border border-gray-300 px-6 py-3 text-gray-700"
                      onClick={() => typeof value === "string" && handleFileClick(value)}
                    >
                      {key === "File Name" ? (
                        <span className="text-purple-500 cursor-pointer">{typeof value === "string" && value}</span>
                      ) : (
                        value as React.ReactNode
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FileViewer Modal */}
      {selectedFile && (
        <div>
          <FileViewer
            filePath={selectedFile.filePath}
            fileName={selectedFile.fileName}
          />
          <button
            onClick={closeFileViewer}
            className="bg-red-500 text-white px-4 py-2 mt-2 rounded-lg hover:bg-red-600"
          >
            Close
          </button>
        </div>
      )}

      {/* Graphs */}
      {graphData && (
        <div className="mt-12 flex justify-around">
          <div className="w-[50vh]">
            <canvas id="barCanvas"></canvas>
          </div>
          <div>
            <canvas id="pieCanvas"></canvas>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableQuery;
