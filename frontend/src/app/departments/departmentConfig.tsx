/**
 * Department Configuration
 * Centralizes department definitions, icons, and URL mappings
 */

import { FaBalanceScale, FaDollarSign, FaShieldAlt, FaEnvelope, FaGraduationCap, FaHeart, FaSeedling, FaGlobe, FaIndustry, FaTractor, FaLeaf, FaRoad, FaTrain, FaBriefcase, FaChild, FaFlask, FaBroadcastTower } from "react-icons/fa";

export type Department =
  | "Ministry of Education"
  | "Ministry of Finance"
  | "Ministry of Health & Family Welfare"
  | "Ministry of Agriculture & Farmers Welfare"
  | "Ministry of Defence"
  | "Ministry of Home Affairs"
  | "Ministry of External Affairs"
  | "Ministry of Commerce & Industry"
  | "Ministry of Rural Development"
  | "Ministry of Environment, Forest & Climate Change"
  | "Ministry of Road Transport & Highways"
  | "Ministry of Railways"
  | "Ministry of Labour & Employment"
  | "Ministry of Women & Child Development"
  | "Ministry of Science & Technology"
  | "Ministry of Information & Broadcasting"
  | "Email Inbox";

export type DepartmentSlug = "education" | "finance" | "health" | "agriculture" | "defence" | "home" | "external" | "commerce" | "rural" | "environment" | "transport" | "railways" | "labour" | "women" | "science" | "information" | "email";

/**
 * Available departments in the system (frontend display names)
 */
export const departments: Department[] = [
  "Email Inbox",
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
  "Ministry of Information & Broadcasting",
];

/**
 * Department to URL slug mapping
 * Used for URL parameter-based routing
 */
export const departmentToSlug: Record<Department, DepartmentSlug> = {
  "Ministry of Education": "education",
  "Ministry of Finance": "finance",
  "Ministry of Health & Family Welfare": "health",
  "Ministry of Agriculture & Farmers Welfare": "agriculture",
  "Ministry of Defence": "defence",
  "Ministry of Home Affairs": "home",
  "Ministry of External Affairs": "external",
  "Ministry of Commerce & Industry": "commerce",
  "Ministry of Rural Development": "rural",
  "Ministry of Environment, Forest & Climate Change": "environment",
  "Ministry of Road Transport & Highways": "transport",
  "Ministry of Railways": "railways",
  "Ministry of Labour & Employment": "labour",
  "Ministry of Women & Child Development": "women",
  "Ministry of Science & Technology": "science",
  "Ministry of Information & Broadcasting": "information",
  "Email Inbox": "email",
};

/**
 * URL slug to department mapping
 * Used for parsing URL parameters
 */
export const slugToDepartment: Record<DepartmentSlug, Department> = {
  "education": "Ministry of Education",
  "finance": "Ministry of Finance",
  "health": "Ministry of Health & Family Welfare",
  "agriculture": "Ministry of Agriculture & Farmers Welfare",
  "defence": "Ministry of Defence",
  "home": "Ministry of Home Affairs",
  "external": "Ministry of External Affairs",
  "commerce": "Ministry of Commerce & Industry",
  "rural": "Ministry of Rural Development",
  "environment": "Ministry of Environment, Forest & Climate Change",
  "transport": "Ministry of Road Transport & Highways",
  "railways": "Ministry of Railways",
  "labour": "Ministry of Labour & Employment",
  "women": "Ministry of Women & Child Development",
  "science": "Ministry of Science & Technology",
  "information": "Ministry of Information & Broadcasting",
  "email": "Email Inbox",
};

/**
 * Department icons configuration
 */
export const departmentIcons: Record<Department, JSX.Element> = {
  "Ministry of Education": <FaGraduationCap className="text-blue-600" />,
  "Ministry of Finance": <FaDollarSign className="text-green-600" />,
  "Ministry of Health & Family Welfare": <FaHeart className="text-red-500" />,
  "Ministry of Agriculture & Farmers Welfare": <FaSeedling className="text-green-700" />,
  "Ministry of Defence": <FaShieldAlt className="text-red-700" />,
  "Ministry of Home Affairs": <FaBalanceScale className="text-indigo-600" />,
  "Ministry of External Affairs": <FaGlobe className="text-blue-500" />,
  "Ministry of Commerce & Industry": <FaIndustry className="text-gray-700" />,
  "Ministry of Rural Development": <FaTractor className="text-amber-600" />,
  "Ministry of Environment, Forest & Climate Change": <FaLeaf className="text-green-600" />,
  "Ministry of Road Transport & Highways": <FaRoad className="text-slate-600" />,
  "Ministry of Railways": <FaTrain className="text-blue-700" />,
  "Ministry of Labour & Employment": <FaBriefcase className="text-purple-600" />,
  "Ministry of Women & Child Development": <FaChild className="text-pink-500" />,
  "Ministry of Science & Technology": <FaFlask className="text-cyan-600" />,
  "Ministry of Information & Broadcasting": <FaBroadcastTower className="text-orange-600" />,
  "Email Inbox": <FaEnvelope className="text-pink-600" />,
};

/**
 * Get department from URL slug with fallback
 */
export function getDepartmentFromSlug(slug: string | null): Department {
  if (!slug) return departments[0]; // Default to first department
  
  const normalizedSlug = slug.toLowerCase() as DepartmentSlug;
  return slugToDepartment[normalizedSlug] || departments[0];
}

/**
 * Get URL slug from department
 */
export function getSlugFromDepartment(department: Department): DepartmentSlug {
  return departmentToSlug[department];
}

/**
 * Department to backend department mapping
 * Maps frontend department names to backend department slugs
 */
export const departmentToBackendSlug: Record<Department, string> = {
  "Ministry of Education": "education",
  "Ministry of Finance": "finance",
  "Ministry of Health & Family Welfare": "health",
  "Ministry of Agriculture & Farmers Welfare": "agriculture",
  "Ministry of Defence": "defence",
  "Ministry of Home Affairs": "home",
  "Ministry of External Affairs": "external",
  "Ministry of Commerce & Industry": "commerce",
  "Ministry of Rural Development": "rural",
  "Ministry of Environment, Forest & Climate Change": "environment",
  "Ministry of Road Transport & Highways": "transport",
  "Ministry of Railways": "railways",
  "Ministry of Labour & Employment": "labour",
  "Ministry of Women & Child Development": "women",
  "Ministry of Science & Technology": "science",
  "Ministry of Information & Broadcasting": "information",
  // Special logical tab; handled specially in UI fetch logic
  "Email Inbox": "all",
};

/**
 * Get backend department slug from frontend department
 */
export function getBackendDepartmentSlug(department: Department): string {
  return departmentToBackendSlug[department];
}

/**
 * Validate if a string is a valid department slug
 */
export function isValidDepartmentSlug(slug: string): slug is DepartmentSlug {
  return Object.keys(slugToDepartment).includes(slug.toLowerCase());
}