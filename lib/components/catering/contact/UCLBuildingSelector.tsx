import { useState } from "react";
import uclBuildings from "@/public/data/ucl-buildings.json";

interface UCLBuildingSelectorProps {
  onSelect: (building: (typeof uclBuildings)[0]) => void;
}

export default function UCLBuildingSelector({
  onSelect,
}: UCLBuildingSelectorProps) {
  const [showBuildings, setShowBuildings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBuildings = uclBuildings.filter(
    (building) =>
      building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      building.addressLine1
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      building.zipcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setShowBuildings(!showBuildings)}
        className="w-full py-2 px-3 text-sm bg-primary/10 border border-primary/30 rounded-lg font-semibold text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        {showBuildings ? "Hide" : "Select"} UCL Building
      </button>

      {showBuildings && (
        <div className="mt-3 border border-primary/20 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="p-3 bg-primary/5 border-b border-primary/20">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UCL buildings..."
              className="w-full px-3 py-2 text-sm border border-primary/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-2">
              {filteredBuildings.length} building
              {filteredBuildings.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredBuildings.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredBuildings.map((building, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelect(building);
                      setShowBuildings(false);
                      setSearchQuery("");
                    }}
                    className="w-full p-3 text-left hover:bg-primary/5 transition-colors group"
                  >
                    <h5 className="text-sm font-semibold text-gray-900 group-hover:text-primary">
                      {building.name}
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">
                      {building.addressLine1}, {building.city} {building.zipcode}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                No buildings found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
