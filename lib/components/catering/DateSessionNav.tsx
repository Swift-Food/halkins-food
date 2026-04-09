"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { DateSessionNavProps } from "./types";

export default function DateSessionNav({
  dayGroups,
  expandedSessionIndex,
  isNavSticky,
  onSessionPillClick,
  onAddDay,
  formatTimeDisplay,
  // Tutorial refs
  addSessionNavButtonRef,
  firstDayTabRef,
  firstSessionPillRef,
}: DateSessionNavProps) {
  const sessionButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const visibleDayGroups = dayGroups.filter((day) => day.date !== "unscheduled");

  return (
    <div
      data-catering-session-nav="true"
      className={`sticky top-0 z-40 bg-base-100 transition-shadow duration-200 ${
        isNavSticky ? "shadow-sm border-b border-base-200" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-2 md:px-6 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {/* Add Session button — always leftmost */}
          <button
            ref={addSessionNavButtonRef}
            onClick={onAddDay}
            className="flex-shrink-0 px-4 py-2 self-stretch rounded-lg border-2 border-dashed border-base-300 text-gray-400 hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center"
          >
            <Plus className="w-4 h-4 mx-auto" />
            <div className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
              Add Session
            </div>
          </button>

          {/* Each day group: date pill + sessions inline, all expanded */}
          {visibleDayGroups.map((day, dayIdx) => {
            const isActiveDay = day.sessions.some(
              ({ index }) => index === expandedSessionIndex
            );
            return (
            <div
              key={day.date}
              className="flex items-stretch gap-0 rounded-lg flex-shrink-0"
            >
              {/* Date label */}
              <div
                ref={dayIdx === 0 ? firstDayTabRef : undefined}
                className={`relative z-10 flex-shrink-0 px-4 py-2 rounded-lg transition-colors ${
                  isActiveDay
                    ? "bg-primary text-white"
                    : "bg-base-200 text-gray-700"
                }`}
              >
                <div className="text-[10px] font-medium opacity-80 text-center">
                  {day.dayName}
                </div>
                <div className="text-sm font-bold">{day.displayDate}</div>
              </div>

              {/* Sessions for this day */}
              {day.sessions.length > 0 && (
                <div
                  className={`flex items-center gap-1.5 pl-3.5 pr-1.5 py-1 rounded-lg -ml-2 ${
                    isActiveDay ? "bg-primary/10" : "bg-base-200/70"
                  }`}
                >
                  {day.sessions.map(({ session, index }, sIdx) => (
                    <button
                      key={index}
                      ref={(el) => {
                        if (el) sessionButtonRefs.current.set(index, el);
                        else sessionButtonRefs.current.delete(index);
                        // Set first session pill ref for tutorial (first day, first session)
                        if (
                          dayIdx === 0 &&
                          sIdx === 0 &&
                          el &&
                          firstSessionPillRef.current !== el
                        ) {
                          (firstSessionPillRef as { current: HTMLButtonElement | null }).current = el;
                        }
                      }}
                      onClick={() => onSessionPillClick(index)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded transition-all ${
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
          );
          })}
        </div>
      </div>
    </div>
  );
}
