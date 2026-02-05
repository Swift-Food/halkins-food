"use client";

import { useState, useRef } from "react";
import CateringFilterModal from "./CateringFilterModal";
import { useCatering } from "@/context/CateringContext";

interface CateringFilterRowProps {
  // Search functionality
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  isSearching?: boolean;

  // Filter functionality (optional)
  hasActiveFilters?: boolean;
  onFilterClick?: () => void;
  filterModalOpen?: boolean;

  // View-only mode (hides date/time inputs)
  hideDateTime?: boolean;

  // Back button (optional)
  showBackButton?: boolean;
  onBackClick?: () => void;
}

// Generate hours from 6 AM to 11 PM (same as Step1EventDetails)
const HOUR_12_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}`,
  value: String(i + 1).padStart(2, "0"),
}));
const MINUTE_OPTIONS = [
  { label: "00", value: "00" },
  { label: "15", value: "15" },
  { label: "30", value: "30" },
  { label: "45", value: "45" },
];

export default function CateringFilterRow({
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  hasActiveFilters = false,
  onFilterClick,
  filterModalOpen = false,
  hideDateTime = false,
  showBackButton = false,
  onBackClick,
}: CateringFilterRowProps) {
  const { eventDetails, setEventDetails } = useCatering();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const closeButtonClickedRef = useRef(false);

  // Separate state for hour and minute
  const [selectedHour, setSelectedHour] = useState(() => {
    if (eventDetails?.eventTime) {
      const h = eventDetails.eventTime.split(":")[0];
      const hour12 = Number(h) % 12 || 12;
      return String(hour12).padStart(2, "0");
    }
    return "";
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (eventDetails?.eventTime) {
      return eventDetails.eventTime.split(":")[1];
    }
    return "";
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (eventDetails?.eventTime) {
      const hour = Number(eventDetails.eventTime.split(":")[0]);
      return hour >= 12 ? "PM" : "AM";
    }
    return "AM";
  });

  // Update eventTime when hour or minute changes
  const handleTimeChange = (hour: string, minute: string, period: string) => {
    if (hour && minute) {
      let hourNum = Number(hour) % 12;
      if (period === "PM") hourNum += 12;
      if (period === "AM" && hourNum === 12) hourNum = 0;
      const timeValue = `${String(hourNum).padStart(2, "0")}:${minute}`;
      setEventDetails({
        eventTime: timeValue,
        eventType: eventDetails?.eventType ?? "",
        eventDate: eventDetails?.eventDate ?? "",
        guestCount: eventDetails?.guestCount ?? 0,
        specialRequests: eventDetails?.specialRequests ?? "",
        address: eventDetails?.address ?? "",
        userType: eventDetails?.userType ?? "guest",
      });
    } else {
      setEventDetails({
        eventTime: "",
        eventType: eventDetails?.eventType ?? "",
        eventDate: eventDetails?.eventDate ?? "",
        guestCount: eventDetails?.guestCount ?? 0,
        specialRequests: eventDetails?.specialRequests ?? "",
        address: eventDetails?.address ?? "",
        userType: eventDetails?.userType ?? "guest",
      });
    }
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date.toISOString().split("T")[0];
  };

  const getMinDate = () => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex md:sticky top-[70px] z-40 md:-mx-4 md:px-4 md:pt-3 md:pb-2 mb-[-1px] overflow-visible relative bg-base-100/80 backdrop-blur-xs">
        <div className="flex items-center justify-center gap-4 relative w-full max-w-[100vw]">
          {/* Back Button (optional) */}
          {showBackButton && onBackClick && (
            <button
              onClick={onBackClick}
              className="w-12 h-12 rounded-full bg-white border border-base-200 hover:bg-base-100 transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Back to All Restaurants"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          )}

          {/* Date/Time Inputs - Hidden when hideDateTime is true */}
          {!hideDateTime && (
            <div className="flex items-center gap-2 md:gap-3 bg-white rounded-full px-4 md:px-8 h-16 border border-base-200 min-w-0 flex-shrink">
              <div className="border-r border-gray-200 pr-3 md:pr-6 min-w-0 flex-shrink w-auto px-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={eventDetails?.eventDate || ""}
                  onChange={(e) =>
                    setEventDetails({
                      eventTime: eventDetails?.eventTime ?? "",
                      eventType: eventDetails?.eventType ?? "",
                      eventDate: e.target.value,
                      guestCount: eventDetails?.guestCount ?? 0,
                      specialRequests: eventDetails?.specialRequests ?? "",
                      address: eventDetails?.address ?? "",
                      userType: eventDetails?.userType ?? "guest",
                    })
                  }
                  max={getMaxDate()}
                  min={getMinDate()}
                  className="text-sm text-gray-600 whitespace-nowrap truncate bg-transparent border-none focus:outline-none w-full"
                />
              </div>
              <div className="pr-2 md:pr-3 min-w-0 flex-shrink flex items-center gap-1 max-w-min">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Time
                  </label>
                  <div className="flex items-center px-3 py-1.5 gap-1">
                    <select
                      value={selectedHour}
                      onChange={(e) => {
                        setSelectedHour(e.target.value);
                        handleTimeChange(
                          e.target.value,
                          selectedMinute,
                          selectedPeriod
                        );
                      }}
                      className="text-sm text-gray-700 bg-transparent border-none focus:outline-none w-8 text-center font-mono cursor-pointer appearance-none"
                      style={{
                        backgroundImage: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                      }}
                    >
                      <option value="">12</option>
                      {HOUR_12_OPTIONS.map((hour) => (
                        <option key={hour.value} value={hour.value}>
                          {hour.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-400 font-mono">:</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) => {
                        setSelectedMinute(e.target.value);
                        handleTimeChange(
                          selectedHour,
                          e.target.value,
                          selectedPeriod
                        );
                      }}
                      className="text-sm text-gray-700 bg-transparent border-none focus:outline-none w-8 text-center font-mono cursor-pointer appearance-none"
                      style={{
                        backgroundImage: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                      }}
                    >
                      <option value="">00</option>
                      {MINUTE_OPTIONS.map((minute) => (
                        <option key={minute.value} value={minute.value}>
                          {minute.label}
                        </option>
                      ))}
                    </select>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => {
                        setSelectedPeriod(e.target.value);
                        handleTimeChange(
                          selectedHour,
                          selectedMinute,
                          e.target.value
                        );
                      }}
                      className="text-sm text-gray-700 bg-transparent border-none focus:outline-none w-10 text-center cursor-pointer appearance-none"
                      style={{
                        backgroundImage: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                      }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Buttons Container */}
          <div className={`flex items-center gap-3 ${hideDateTime ? 'flex-1' : 'flex-shrink-0'}`}>
            {/* Search Button/Bar */}
            <div
              className={`group flex items-center ${hideDateTime ? 'flex-1' : ''}`}
              onMouseEnter={() => {
                if (!hideDateTime) {
                  setSearchExpanded(true);
                  setSearchHovered(true);
                }
              }}
              onMouseLeave={() => {
                if (!hideDateTime) {
                  setSearchHovered(false);
                  if (!searchQuery && !searchFocused) setSearchExpanded(false);
                }
              }}
            >
              <div
                className={`flex items-center bg-white rounded-full transition-all duration-300 ease-in-out overflow-hidden h-12 border border-base-200 px-4 gap-3 ${
                  hideDateTime ? 'w-full' : (searchExpanded ? "w-[280px] lg:w-[400px]" : "w-[200px]")
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    setSearchFocused(false);
                    if (!searchHovered && !searchQuery) {
                      setSearchExpanded(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSearch();
                    }
                  }}
                  placeholder="Search"
                  className="flex-1 text-sm text-gray-600 placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={onClearSearch}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Button (optional) */}
            {onFilterClick && (
              <div
                onMouseEnter={() => !hideDateTime && setFilterExpanded(true)}
                onMouseLeave={() => !hideDateTime && setFilterExpanded(false)}
              >
                <button
                  onClick={() => {
                    if (closeButtonClickedRef.current) {
                      closeButtonClickedRef.current = false;
                      return;
                    }
                    if (!filterModalOpen) {
                      onFilterClick();
                    }
                  }}
                  className={`rounded-full border border-base-200 transition-all duration-300 ease-in-out flex-shrink-0 flex items-center overflow-hidden ${
                    hideDateTime
                      ? "w-12 h-12 justify-center"
                      : `h-16 ${filterExpanded || filterModalOpen
                          ? "w-40 px-4 gap-2 justify-between"
                          : "w-16 justify-center"
                        }`
                  } ${
                    hasActiveFilters || filterModalOpen
                      ? "bg-primary text-white"
                      : "bg-white"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                    />
                  </svg>
                  {!hideDateTime && (filterExpanded || filterModalOpen) && (
                    <>
                      <span className="text-sm font-medium whitespace-nowrap text-center flex-1">
                        Filters
                      </span>
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          closeButtonClickedRef.current = true;
                          onFilterClick();
                        }}
                        className={`filter-close-btn rounded-full h-8 w-8 bg-white text-black justify-center items-center cursor-pointer ${
                          filterModalOpen ? "flex" : "hidden"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="6" y1="6" x2="18" y2="18" />
                          <line x1="6" y1="18" x2="18" y2="6" />
                        </svg>
                      </div>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout - Date/Time - Hidden when hideDateTime is true */}
      {!hideDateTime && (
        <section className="md:hidden mb-2">
        <div className="bg-white rounded-2xl border-1 border-base-200">
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-2 flex-1 py-1 border-r-1 border-gray-200 justify-center">
              {/* <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg> */}
              <input
                type="date"
                value={eventDetails?.eventDate || ""}
                onChange={(e) =>
                  setEventDetails({
                    eventTime: eventDetails?.eventTime ?? "",
                    eventType: eventDetails?.eventType ?? "",
                    eventDate: e.target.value,
                    guestCount: eventDetails?.guestCount ?? 0,
                    specialRequests: eventDetails?.specialRequests ?? "",
                    address: eventDetails?.address ?? "",
                    userType: eventDetails?.userType ?? "guest",
                  })
                }
                max={getMaxDate()}
                min={getMinDate()}
                className="text-base text-base-content font-medium bg-transparent border-none focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 py-2 justify-center">
              <div className="flex items-center px-4 py-2 gap-1.5">
                <select
                  value={selectedHour}
                  onChange={(e) => {
                    setSelectedHour(e.target.value);
                    handleTimeChange(
                      e.target.value,
                      selectedMinute,
                      selectedPeriod
                    );
                  }}
                  className="text-base text-gray-800 font-medium bg-transparent border-none focus:outline-none text-center font-mono cursor-pointer appearance-none w-9"
                  style={{
                    backgroundImage: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    textAlign: "center",
                    textAlignLast: "center",
                  }}
                >
                  <option value="">12</option>
                  {HOUR_12_OPTIONS.map((hour) => (
                    <option key={hour.value} value={hour.value}>
                      {hour.label}
                    </option>
                  ))}
                </select>
                <span className="text-base text-gray-400 font-mono">:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => {
                    setSelectedMinute(e.target.value);
                    handleTimeChange(
                      selectedHour,
                      e.target.value,
                      selectedPeriod
                    );
                  }}
                  className="text-base text-gray-800 font-medium bg-transparent border-none focus:outline-none text-center font-mono cursor-pointer appearance-none w-9"
                  style={{
                    backgroundImage: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    textAlign: "center",
                    textAlignLast: "center",
                  }}
                >
                  <option value="">00</option>
                  {MINUTE_OPTIONS.map((minute) => (
                    <option key={minute.value} value={minute.value}>
                      {minute.label}
                    </option>
                  ))}
                </select>
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    handleTimeChange(
                      selectedHour,
                      selectedMinute,
                      e.target.value
                    );
                  }}
                  className="text-base text-gray-800 font-medium bg-transparent border-none focus:outline-none text-center cursor-pointer appearance-none w-11"
                  style={{
                    backgroundImage: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    textAlign: "center",
                    textAlignLast: "center",
                  }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Mobile Search and Filter Row */}
      <div className="md:hidden sticky top-[68px] z-40 -mx-4 px-4 py-3 mb-6 bg-base-100/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 w-full">
          {/* Back Button (optional) */}
          {showBackButton && onBackClick && (
            <button
              onClick={onBackClick}
              className="w-12 h-12 rounded-full bg-white border border-base-200 hover:bg-base-100 transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Back to All Restaurants"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          )}

          {/* Search Bar fills available width */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center bg-white rounded-full h-12 px-3 w-full border-1 border-base-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-400 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSearch();
                  }
                }}
                placeholder="Search"
                className="flex-1 text-base text-gray-600 placeholder-gray-400 focus:outline-none bg-transparent ml-2"
              />
              {searchQuery && (
                <button
                  onClick={onClearSearch}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Button (optional) - animated on mobile */}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className={`rounded-full transition-all duration-300 ease-in-out flex-shrink-0 flex items-center justify-center h-12 overflow-hidden border-1 border-base-200 ${
                filterModalOpen ? "w-32 px-4 gap-2" : "w-12"
              } ${
                hasActiveFilters || filterModalOpen
                  ? "bg-primary text-white"
                  : "bg-white"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                />
              </svg>
              {filterModalOpen && (
                <span className="text-sm font-medium whitespace-nowrap text-white">
                  Filters
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal - Rendered below the sticky row */}
      {onFilterClick && (
        <CateringFilterModal isOpen={filterModalOpen} onClose={onFilterClick} />
      )}
    </>
  );
}
