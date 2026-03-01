/**
 * DepartmentSidebar Component
 * Handles the department navigation sidebar with icons and selection
 */

"use client";

import React from "react";
import { Department, departments, departmentIcons } from "../departmentConfig";

interface DepartmentSidebarProps {
  selectedDept: Department;
  onDepartmentSelect: (department: Department) => void;
}

export default function DepartmentSidebar({ 
  selectedDept, 
  onDepartmentSelect
}: DepartmentSidebarProps) {
  return (
    <aside className="w-72 bg-white/80 border-r border-gray-200 p-6 flex flex-col shadow-lg rounded-r-3xl transition-all duration-300">
      <h2 className="text-xl font-extrabold mb-6 text-blue-700 tracking-wide">
        Departments
      </h2>
      <ul className="space-y-2">
        {departments.map((dept) => (
          <li key={dept}>
            <button
              className={`flex items-center w-full text-left px-4 py-3 rounded-xl transition-all duration-200 text-base font-medium shadow-sm hover:scale-[1.03] hover:bg-blue-100/60 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                selectedDept === dept 
                  ? "bg-blue-600 text-white scale-[1.04] font-bold shadow-md" 
                  : "text-gray-700"
              }`}
              onClick={() => onDepartmentSelect(dept)}
              aria-current={selectedDept === dept ? "page" : undefined}
            >
              {React.cloneElement(departmentIcons[dept], { 
                className: `text-xl mr-3 ${
                  selectedDept === dept 
                    ? 'text-white' 
                    : departmentIcons[dept].props.className.split(' ').find((c: string) => c.startsWith('text-'))
                }` 
              })}
              {dept}
            </button>
          </li>
        ))}

      </ul>
    </aside>
  );
}