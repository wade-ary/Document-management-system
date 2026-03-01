/* eslint-disable @typescript-eslint/no-explicit-any */
// Search management utility functions for frontend
import API_BASE_URL from '../config/api';

export class SearchManager {
  private static baseUrl = API_BASE_URL;

  /**
   * Rebuild search indexes manually
   */
  static async rebuildIndexes(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/rebuild`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to rebuild search indexes');
      }

      const data = await response.json();
      return { success: true, message: data.message || 'Search indexes rebuilt successfully' };
    } catch (error) {
      console.error('Error rebuilding search indexes:', error);
      return { success: false, message: `Failed to rebuild indexes: ${error}` };
    }
  }

  /**
   * Get search statistics
   */
  static async getSearchStats(): Promise<{
    success: boolean;
    stats?: {
      faiss_available: boolean;
      faiss_index_size: number;
      metadata_cache_size: number;
      tfidf_features: number;
      bm25_available: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get search stats');
      }

      const stats = await response.json();
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting search stats:', error);
      return { success: false, error: `Failed to get stats: ${error}` };
    }
  }

  /**
   * Enhanced search with all parameters
   */
  static async enhancedSearch(params: {
    searchText: string;
    fileType?: string[];
    peopleNames?: string[];
    customTags?: string[];
    dateRange?: string[];
    limit?: number;
  }): Promise<{
    success: boolean;
    results?: any[];
    total_found?: number;
    search_time?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/extensive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return { success: true, ...data };
    } catch (error) {
      console.error('Enhanced search error:', error);
      return { success: false, error: `Search failed: ${error}` };
    }
  }

  /**
   * Find precedents for a document
   */
  static async findPrecedents(params: {
    file_id: string;
    similarity_threshold?: number;
    file_types?: string[];
    date_range?: string[];
    top_k?: number;
  }): Promise<{
    success: boolean;
    results?: any[];
    total_found?: number;
    current_document?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/find-precedents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to find precedents');
      }

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error };
      }
      return { success: true, ...data };
    } catch (error) {
      console.error('Find precedents error:', error);
      return { success: false, error: `Failed to find precedents: ${error}` };
    }
  }

  /**
   * Compare two documents
   */
  static async compareDocuments(
    fileId1: string,
    fileId2: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/compare-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id_1: fileId1,
          file_id_2: fileId2,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare documents');
      }

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Compare documents error:', error);
      return { success: false, error: `Failed to compare documents: ${error}` };
    }
  }

  /**
   * Analyze precedent relationship
   */
  static async analyzePrecedent(
    currentFileId: string,
    precedentFileId: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/precedent-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_file_id: currentFileId,
          precedent_file_id: precedentFileId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze precedent');
      }

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Analyze precedent error:', error);
      return { success: false, error: `Failed to analyze precedent: ${error}` };
    }
  }
}

export default SearchManager;