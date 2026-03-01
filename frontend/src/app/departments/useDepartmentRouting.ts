/**
 * Custom hook for URL-based department routing
 * Handles URL parameter synchronization with department selection
 */

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { 
  Department, 
  departments, 
  getDepartmentFromSlug, 
  getSlugFromDepartment 
} from "./departmentConfig";

export function useDepartmentRouting() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial department from URL or default to first department
  const initialDepartment = getDepartmentFromSlug(searchParams.get('dept'));
  const [selectedDept, setSelectedDept] = useState<Department>(initialDepartment);

  /**
   * Update URL when department changes
   */
  const updateURL = useCallback((department: Department) => {
    const slug = getSlugFromDepartment(department);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('dept', slug);
    
    // Use replace to avoid adding to browser history for every tab click
    router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  /**
   * Handle department selection with URL update
   */
  const selectDepartment = useCallback((department: Department) => {
    setSelectedDept(department);
    updateURL(department);
  }, [updateURL]);

  /**
   * Sync state with URL changes (e.g., browser back/forward)
   */
  useEffect(() => {
    const urlDepartment = getDepartmentFromSlug(searchParams.get('dept'));
    if (urlDepartment !== selectedDept) {
      setSelectedDept(urlDepartment);
    }
  }, [searchParams, selectedDept]);

  /**
   * Set initial URL parameter if not present
   */
  useEffect(() => {
    const deptParam = searchParams.get('dept');
    if (!deptParam) {
      updateURL(selectedDept);
    }
  }, [searchParams, selectedDept, updateURL]);

  return {
    selectedDept,
    selectDepartment,
    departments,
  };
}