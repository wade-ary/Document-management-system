"use client";

import React, { useState } from "react";
import { Card, CardBody } from "@nextui-org/react";
import { Button } from "@nextui-org/react";
import { Input } from "@nextui-org/react";
import { Search, FileText, Sparkles, AlertCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";
import PrecedentFinder from "@/components/PrecedentFinder";
import { toast } from "react-toastify";

interface QueryResultDoc {
  file_id: string;
  rrf_score?: number;
  fuzzy_score?: number;
  metadata?: { name?: string; summary?: string; file_id?: string; path?: string };
}

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QueryResultDoc[]>([]);
  const [intent, setIntent] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [blurbTaskId, setBlurbTaskId] = useState<string | null>(null);
  const [blurb, setBlurb] = useState<string | null>(null);
  const [blurbPolling, setBlurbPolling] = useState(false);
  const [systemDown, setSystemDown] = useState(false);
  const [precedentFileId, setPrecedentFileId] = useState<string | null>(null);
  const [showPrecedentFinder, setShowPrecedentFinder] = useState(false);

  const runQuery = async () => {
    const q = (query || "").trim();
    if (!q) {
      toast.error("Enter a query");
      return;
    }
    setLoading(true);
    setResults([]);
    setBlurb(null);
    setBlurbTaskId(null);
    setSystemDown(false);
    try {
      const res = await fetch(API_ENDPOINTS.QUERY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (res.status === 503 && data.code === "SEARCH_SYSTEM_DOWN") {
        setSystemDown(true);
        toast.error(data.error || "Search temporarily unavailable.");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Query failed");
        return;
      }
      setResults(data.results || []);
      setIntent(data.intent || null);
      setReasoning(data.reasoning || null);
      setBlurbTaskId(data.blurb_task_id || null);
      setBlurb(null);
      if (data.blurb_task_id) {
        pollBlurb(data.blurb_task_id);
      }
    } catch (e) {
      toast.error("Request failed");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pollBlurb = async (taskId: string) => {
    setBlurbPolling(true);
    const maxAttempts = 20;
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.BLURB, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId }),
        });
        const data = await res.json();
        if (data.status === "done" && data.blurb) {
          setBlurb(data.blurb);
          setBlurbPolling(false);
          return;
        }
        if (data.status === "error" || data.error) {
          setBlurbPolling(false);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 800);
        else setBlurbPolling(false);
      } catch {
        setBlurbPolling(false);
      }
    };
    poll();
  };

  const openPrecedentFinder = (fileId: string) => {
    setPrecedentFileId(fileId);
    setShowPrecedentFinder(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Document Query</h1>
        <p className="text-slate-600 mb-8">Search documents, view the AI blurb, and find similar precedents.</p>

        {/* Query input */}
        <Card className="mb-6">
          <CardBody className="gap-4">
            <Input
              placeholder="Enter your question or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runQuery()}
              size="lg"
              startContent={<Search className="w-5 h-5 text-slate-400" />}
            />
            <Button
              color="primary"
              onPress={runQuery}
              isLoading={loading}
              startContent={!loading ? <Search className="w-4 h-4" /> : null}
            >
              Search
            </Button>
          </CardBody>
        </Card>

        {systemDown && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardBody className="flex flex-row items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <p className="text-amber-800">Search is temporarily unavailable. Technical team has been notified.</p>
            </CardBody>
          </Card>
        )}

        {/* Intent + reasoning */}
        {(intent || reasoning) && (
          <Card className="mb-6">
            <CardBody>
              {intent && (
                <p className="text-sm text-slate-600 mb-1">
                  <span className="font-medium">Intent:</span> {intent === "multi_hop" ? "Multi-document" : "Single-document"}
                </p>
              )}
              {reasoning && <p className="text-sm text-slate-600">{reasoning}</p>}
            </CardBody>
          </Card>
        )}

        {/* Blurb */}
        {(blurbTaskId || blurb) && (
          <Card className="mb-6 border-blue-100">
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Summary (Blurb)
              </h2>
              {blurbPolling && !blurb && <p className="text-slate-500">Generating summary...</p>}
              {blurb && <p className="text-slate-700 whitespace-pre-wrap">{blurb}</p>}
            </CardBody>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card className="mb-6">
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Results ({results.length})
              </h2>
              <ul className="space-y-3">
                {results.map((doc) => {
                  const meta = doc.metadata || {};
                  const name = meta.name || doc.file_id;
                  return (
                    <li
                      key={doc.file_id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{name}</p>
                        {meta.summary && (
                          <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">{meta.summary}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => openPrecedentFinder(doc.file_id)}
                      >
                        Find similar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        )}

        {/* Precedent finder modal */}
        {showPrecedentFinder && precedentFileId && (
          <PrecedentFinder
            fileId={precedentFileId}
            onClose={() => {
              setShowPrecedentFinder(false);
              setPrecedentFileId(null);
            }}
            onViewComparison={() => toast.info("Compare view can be added here.")}
            onViewAnalysis={() => toast.info("Analysis view can be added here.")}
          />
        )}
      </div>
    </div>
  );
}
