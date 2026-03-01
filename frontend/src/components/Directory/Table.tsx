interface TableProps {
    data: { [key: string]: unknown }[];
    columns: string[];
  }
  
  const Table: React.FC<TableProps> = ({ data, columns }) => {
    if (!data || data.length === 0) return <p>No data to display</p>;
  
    const allKeys = new Set(
      data.flatMap((item) => Object.keys(item)).concat(columns)
    );
  
    return (
      <table border={1} style={{ width: "100%", marginTop: "20px" }}>
        <thead>
          <tr>
            {Array.from(allKeys).map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              {Array.from(allKeys).map((key) => (
                <td key={key}>{String(item[key]) || "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  
  export default Table;
  