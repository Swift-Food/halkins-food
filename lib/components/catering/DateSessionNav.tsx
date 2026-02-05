"use client";

import { useRef } from "react";
import { ChevronLeft, Calendar, Plus } from "lucide-react";
import { DateSessionNavProps } from "./types";

export default function DateSessionNav({
  navMode,
  dayGroups,
  selectedDayDate,
  currentDayGroup,
  expandedSessionIndex,
  isNavSticky,
  onDateClick,
  onBackToDates,
  onSessionPillClick,
  onAddDay,
  onAddSessionToDay,
  formatTimeDisplay,
  // Tutorial refs
  addDayNavButtonRef,
  backButtonRef,
  firstDayTabRef,
  firstSessionPillRef,
  addSessionNavButtonRef,
}: DateSessionNavProps) {
  const sessionButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  return (
    <div
      className={`sticky top-0 z-40 bg-base-100 transition-shadow duration-200 ${
        isNavSticky ? "shadow-sm border-b border-base-200" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-2 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {navMode === "dates" ? (
            <>
              {/* Date Tabs */}
              {dayGroups
                .filter((day) => day.date !== "unscheduled")
                .map((day, idx) => (
                  <button
                    key={day.date}
                    ref={idx === 0 ? firstDayTabRef : undefined}
                    onClick={() => onDateClick(day.date)}
                    className="flex-shrink-0 px-4 py-2 rounded-lg bg-base-200 text-gray-600 hover:bg-primary/10 transition-all"
                  >
                    <div className="text-[10px] font-medium opacity-80">
                      {day.dayName}
                    </div>
                    <div className="text-sm font-bold">{day.displayDate}</div>
                  </button>
                ))}
              {/* Add Day Button */}
              <button
                ref={addDayNavButtonRef}
                onClick={onAddDay}
                className="flex-shrink-0 px-4 py-2 rounded-lg border-2 border-dashed border-base-300 text-gray-400 hover:border-primary hover:text-primary transition-colors"
              >
                <Calendar className="w-4 h-4 mx-auto" />
                <div className="text-[10px] font-medium mt-0.5">Add Day</div>
              </button>
            </>
          ) : (
            <>
              {/* Back Button - matches height of pink container */}
              <button
                ref={backButtonRef}
                onClick={onBackToDates}
                className="flex-shrink-0 w-10 self-stretch rounded-lg bg-base-200 text-gray-600 hover:bg-primary/10 transition-all flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Date + Sessions - all in one scrollable pink container */}
              <div className="flex items-stretch gap-0 animate-[expandIn_0.3s_ease-out] bg-primary/10 rounded-lg min-w-0 overflow-x-auto scrollbar-hide">
                {/* Current Date Indicator - Same size as dates view */}
                {(currentDayGroup || selectedDayDate) && (
                  <div className="flex-shrink-0 px-4 py-2 rounded-lg bg-primary text-white">
                    <div className="text-[10px] font-medium opacity-80 text-center">
                      {currentDayGroup?.dayName ||
                        (selectedDayDate && selectedDayDate !== "unscheduled"
                          ? new Date(
                              selectedDayDate + "T00:00:00"
                            ).toLocaleDateString("en-GB", { weekday: "short" })
                          : "")}
                    </div>
                    <div className="text-sm font-bold">
                      {currentDayGroup?.displayDate ||
                        (selectedDayDate && selectedDayDate !== "unscheduled"
                          ? new Date(
                              selectedDayDate + "T00:00:00"
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })
                          : "No Date")}
                    </div>
                  </div>
                )}

                {/* Sessions Container - connected to date */}
                {currentDayGroup && currentDayGroup.sessions.length > 0 && (
                  <div className="flex items-center gap-1.5 pl-1.5 pr-1.5 py-1">
                    {/* Session Pills - Smaller */}
                    {currentDayGroup.sessions.map(({ session, index }, i) => (
                      <button
                        key={index}
                        ref={(el) => {
                          if (el) sessionButtonRefs.current.set(index, el);
                          else sessionButtonRefs.current.delete(index);
                          // Set first session pill ref for tutorial
                          if (i === 0 && el && firstSessionPillRef.current !== el) {
                            (firstSessionPillRef as { current: HTMLButtonElement | null }).current = el;
                          }
                        }}
                        onClick={() => onSessionPillClick(index)}
                        style={{ animationDelay: `${(i + 1) * 50}ms` }}
                        className={`flex-shrink-0 px-2.5 py-1 rounded transition-all animate-[slideIn_0.25s_ease-out_both] ${
                          expandedSessionIndex === index
                            ? "bg-white text-primary border border-primary"
                            : "bg-white/60 text-gray-600 hover:bg-white border border-transparent"
                        }`}
                      >
                        <div className="text-[9px] font-medium opacity-70">
                          {formatTimeDisplay(session.eventTime)}
                        </div>
                        <div className="text-xs font-semibold leading-tight whitespace-nowrap">
                          {session.sessionName}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Session button - outside the pink container */}
              {selectedDayDate && selectedDayDate !== "unscheduled" && (
                <button
                  ref={addSessionNavButtonRef}
                  onClick={() => onAddSessionToDay(selectedDayDate)}
                  className="flex-shrink-0 px-2.5 py-1 self-stretch rounded-lg border-2 border-dashed border-base-300 text-gray-400 hover:border-primary hover:text-primary transition-colors animate-[fadeIn_0.3s_ease-out_0.2s_both] flex flex-col items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <div className="text-[9px] font-medium whitespace-nowrap">
                    Add Session
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
