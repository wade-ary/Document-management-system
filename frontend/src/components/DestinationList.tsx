"use client";

// import { Button } from "@nextui-org/react";
import { FaTrash } from "react-icons/fa";

export default function DestinationList({
  destinations,
  setDestinations,
}: {
  destinations: string[];
  setDestinations: (destinations: string[]) => void;
}) {
  return (
    <ul className="space-y-[1px]">
      {destinations.map((dest) => (
        <div key={dest}>
          <li className=" py-1 leading-10">
            <div className="flex justify-between items-center gap-3">
              <div className="truncate text-[14px]" title={dest}>
                {dest}
              </div>
              <div 
                onClick={() =>
                  setDestinations(destinations.filter((d) => d !== dest))
                }
                className="cursor-pointer"
              >
                <FaTrash color="red" size={12}/>
              </div>
            </div>
          </li>
          <div className="border-1 border-slate-300"/>
        </div>
      ))}
    </ul>
  );
}
