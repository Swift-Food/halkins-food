"use client";

import { useRef, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { DateSessionNavProps } from "./types";

export default function DateSessionNav({
  dayGroups,
  expandedSessionIndex,
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

  const navRef = useRef<HTMLDivElement>(null);
  const [isNavSticky, setIsNavSticky] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsNavSticky(entry.intersectionRatio < 1),
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={navRef}
      data-catering-session-nav="true"
      className={`sticky top-0 z-40 bg-base-100 transition-shadow duration-200 ${
        isNavSticky
          ? "shadow-[0_6px_4px_-4px_rgba(0,0,0,0.1)] border-b border-base-200"
          : ""
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
                <div className="flex items-stretch gap-0.5 pl-3.5 pr-1.5 bg-white border border-base-300 rounded-lg -ml-2">
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
                      className={`flex flex-col justify-center flex-shrink-0 px-2.5 pb-0.5 transition-all border-b-2 ${
                        expandedSessionIndex === index
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700"
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
