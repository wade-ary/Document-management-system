"use client";
import React, { useState } from "react";
interface AddColumnsProps {
    columns: string[];
    setColumns: (columns: string[]) => void;
  }
  
  const AddColumns: React.FC<AddColumnsProps> = ({ columns, setColumns }) => {
    const [newColumn, setNewColumn] = useState<string>("");
  
    const addColumn = () => {
      if (newColumn.trim() !== "") {
        setColumns([...columns, newColumn]);
        setNewColumn("");
      }
    };
  
    return (
      <div style={{ marginTop: "20px" }}>
        <h3>Add Custom Columns</h3>
        <input
          type="text"
          placeholder="Enter column name"
          value={newColumn}
          onChange={(e) => setNewColumn(e.target.value)}
        />
        <button onClick={addColumn}>Add Column</button>
  
        <div>
          <h4>Current Columns:</h4>
          <ul>
            {columns.map((col, index) => (
              <li key={index}>{col}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  
  export default AddColumns;
  