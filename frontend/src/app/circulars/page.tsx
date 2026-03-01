'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '@/config/api';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';
import { Search, RefreshCw, ExternalLink, Download, FileText, Clock, Tag, Calendar, Filter } from 'lucide-react';

type CircularItem = {
  title: string;
  date?: string;
  pdf_url: string;
  source: string;
  serial?: string;
  link_type?: string;
  size?: string;
};

type CircularFeed = {
  source: string;
  last_refreshed?: string;
  items: CircularItem[];
  loading: boolean;
  error?: string;
  page: number;
  limit: number;
  has_more?: boolean;
  total_available?: number;
  total_pending?: boolean;
};

const SOURCES = [
  {
    id: 'aicte',
    name: 'AICTE Circulars',
    endpoint: API_ENDPOINTS.CIRCULARS.AICTE,
    color: 'blue',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'moe',
    name: 'MoE Documents & Reports',
    endpoint: API_ENDPOINTS.CIRCULARS.MOE,
    color: 'emerald',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'ugc',
    name: 'UGC Regulations',
    endpoint: API_ENDPOINTS.CIRCULARS.UGC,
    color: 'orange',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'naac',
    name: 'NAAC / NBA Documents',
    endpoint: API_ENDPOINTS.CIRCULARS.NAAC,
    color: 'violet',
    icon: <FileText className="w-5 h-5" />,
  },
];

const PAGE_SIZE = 20;

export default function CircularsPage() {
  const { user } = useUser();
  const [feeds, setFeeds] = useState<Record<string, CircularFeed>>(() =>
    SOURCES.reduce(
      (acc, src) => ({
        ...acc,
        [src.id]: { source: src.name, items: [], loading: true, page: 1, limit: PAGE_SIZE },
      }),
      {} as Record<string, CircularFeed>,
    ),
  );
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const userId = user?.id;

  const fetchFeed = async (id: string, endpoint: string, page: number = 1) => {
    setFeeds((prev) => ({ ...prev, [id]: { ...prev[id], loading: true, error: undefined, page } }));
    try {
      const res = await fetch(`${endpoint}?page=${page}&limit=${PAGE_SIZE}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setFeeds((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          source: data?.source || prev[id].source,
          last_refreshed: data?.last_refreshed,
          items: data?.items || [],
          page: data?.page || page,
          limit: data?.limit || PAGE_SIZE,
          has_more: data?.has_more,
          total_available: data?.total_available,
          total_pending: data?.total_pending,
          loading: false,
          error: undefined,
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load feed';
      setFeeds((prev) => ({
        ...prev,
        [id]: { ...prev[id], loading: false, error: message },
      }));
    }
  };

  const refreshAll = () => {
    SOURCES.forEach((src) => fetchFeed(src.id, src.endpoint, feeds[src.id]?.page || 1));
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = useCallback(
    async (item: CircularItem, sourceId: string) => {
      if (!userId) {
        toast.error('Please sign in to import documents.');
        return;
      }
      const path = `circulars/${sourceId}`;
      try {
        toast.loading('Importing...', { id: 'import' });
        const res = await fetch(API_ENDPOINTS.CIRCULARS.IMPORT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf_url: item.pdf_url,
            user_id: userId,
            path,
            document_type: 'circular',
            source: item.source,
            title: item.title,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Import failed');
        toast.success('Imported to platform', { id: 'import' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Import failed';
        toast.error(message, { id: 'import' });
      }
    },
    [userId],
  );

  const freshnessText = (ts?: string) => {
    if (!ts) return 'Not refreshed yet';
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const handlePageChange = (sourceId: string, direction: 'prev' | 'next') => {
    const src = SOURCES.find((s) => s.id === sourceId);
    if (!src) return;
    const currentPage = feeds[sourceId]?.page || 1;
    const nextPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
    // Only block next if no more
    if (direction === 'next' && feeds[sourceId]?.has_more === false) return;
    fetchFeed(sourceId, src.endpoint, nextPage);
  };

  // Filter items based on search and active tab
  const filteredItems = useMemo(() => {
    const allItems: (CircularItem & { sourceId: string })[] = [];
    
    SOURCES.forEach((src) => {
      const feed = feeds[src.id];
      if (feed?.items) {
        feed.items.forEach((item) => {
          allItems.push({ ...item, sourceId: src.id });
        });
      }
    });

    return allItems.filter((item) => {
      const matchesTab = activeTab === 'all' || item.sourceId === activeTab;
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.serial && item.serial.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [feeds, activeTab, searchQuery]);

  const isLoading = SOURCES.some((src) => feeds[src.id]?.loading);
  const hasError = SOURCES.some((src) => feeds[src.id]?.error);

  const totalItems = SOURCES.reduce((acc, src) => acc + (feeds[src.id]?.items?.length || 0), 0);
  const totalAvailableAll = SOURCES.reduce((acc, src) => acc + (feeds[src.id]?.total_available || 0), 0);
  const hasPendingTotals = SOURCES.some((src) => feeds[src.id]?.total_pending);

  // Auto-refresh once if totals are pending
  useEffect(() => {
    if (!hasPendingTotals) return;
    const timer = setTimeout(() => {
      SOURCES.forEach((src) => fetchFeed(src.id, src.endpoint, feeds[src.id]?.page || 1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [hasPendingTotals, feeds]);
  const activeSource = SOURCES.find((s) => s.id === activeTab);
  const activeFeed = activeSource ? feeds[activeSource.id] : undefined;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Grid Background Pattern */}
      <div className="fixed inset-0 bg-slate-50 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>

      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
            Official Circulars Hub
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">
          AICTE, MoE & UGC <span className="text-blue-600">Circulars</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
          Browse and preview official circulars from AICTE, Ministry of Education, and UGC. 
          Open documents in a new tab or import them directly into the platform.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-slate-900">{totalAvailableAll || totalItems}</p>
                {hasPendingTotals && (
                  <span className="text-xs text-slate-500 animate-pulse">updating…</span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {totalAvailableAll ? 'Total Available' : 'Loaded Documents'}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{SOURCES.length}</p>
              <p className="text-sm text-slate-500">Sources</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {feeds.aicte?.last_refreshed ? freshnessText(feeds.aicte.last_refreshed).split(',')[0] : 'N/A'}
              </p>
              <p className="text-sm text-slate-500">Last Updated</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Filter className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{filteredItems.length}</p>
              <p className="text-sm text-slate-500">Showing</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search circulars by title or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'all' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Sources
              </button>
              {SOURCES.map((src) => (
                <button
                  key={src.id}
                  onClick={() => setActiveTab(src.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === src.id 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {src.id.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <Button
              onClick={refreshAll}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Pagination (per source) */}
          {activeSource && activeTab !== 'all' && (
            <div className="mt-4 flex items-center justify-end gap-3">
              <span className="text-sm text-slate-500">
                Page {activeFeed?.page || 1} • {activeFeed?.items?.length || 0} items
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(activeSource.id, 'prev')}
                  disabled={(activeFeed?.page || 1) <= 1 || activeFeed?.loading}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(activeSource.id, 'next')}
                  disabled={activeFeed?.loading || activeFeed?.has_more === false}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-slate-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-lg font-medium">Loading circulars...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <p className="text-red-700 font-medium">Error loading some feeds. Please try refreshing.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !hasError && filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No circulars found</h3>
            <p className="text-slate-500">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'No documents available from selected sources'}
            </p>
          </div>
        )}

        {/* Circulars Grid */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="grid gap-4">
            {filteredItems.map((item, idx) => (
              <div
                key={`${item.sourceId}-${idx}-${item.pdf_url}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Source Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.sourceId === 'aicte'
                          ? 'bg-blue-100 text-blue-700'
                          : item.sourceId === 'moe'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.sourceId === 'ugc'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-violet-100 text-violet-700'
                      }`}>
                        <FileText className="w-3 h-3" />
                        {item.sourceId.toUpperCase()}
                      </span>
                      {item.link_type && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {item.link_type}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      {item.date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {item.date}
                        </span>
                      )}
                      {item.serial && (
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-4 h-4" />
                          Ref: {item.serial}
                        </span>
                      )}
                      {item.size && (
                        <span className="text-slate-400">
                          {item.size}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-2"
                    >
                      <a href={item.pdf_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Open PDF
                      </a>
                    </Button>
                    <Button
                      onClick={() => handleImport(item, item.sourceId)}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Import
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Data sourced from official AICTE and Ministry of Education portals. 
            Documents are fetched in real-time and not stored until imported.
          </p>
        </div>
      </div>
    </div>
  );
}

