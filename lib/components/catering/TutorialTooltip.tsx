"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export interface TutorialStep {
  id: string;
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  requiresClick?: boolean; // User must click the target to proceed
  showNext?: boolean; // Show "Next" button
  showSkip?: boolean; // Show "Skip Tutorial" button
  highlightPadding?: number; // Padding around highlight
  highlightExtendBottom?: number; // Extra height to extend highlight downward
  onBeforeShow?: () => void; // Called before showing this step
}

interface TutorialTooltipProps {
  step: TutorialStep | null;
  onNext: () => void;
  onSkip: () => void;
  currentStepIndex: number;
  totalSteps: number;
}

export default function TutorialTooltip({
  step,
  onNext,
  onSkip,
  currentStepIndex,
  totalSteps,
}: TutorialTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!step?.targetRef?.current || !tooltipRef.current) return;

    const targetEl = step.targetRef.current;
    const tooltipEl = tooltipRef.current;
    const targetRect = targetEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    // Store highlight rect for the spotlight effect
    setHighlightRect(targetRect);

    // Calculate tooltip position based on specified position
    let top = 0;
    let left = 0;
    const gap = 12; // Gap between tooltip and target

    // Calculate ideal centered position
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Account for highlight extensions when positioning
    const highlightExtendBottom = step.highlightExtendBottom ?? 0;
    const highlightPadding = step.highlightPadding ?? 8;

    switch (step.position) {
      case "top":
        top = targetRect.top - tooltipRect.height - gap - highlightPadding;
        left = targetCenterX - tooltipRect.width / 2;
        break;
      case "bottom":
        // Position below the extended highlight area
        top = targetRect.bottom + gap + highlightExtendBottom + highlightPadding;
        left = targetCenterX - tooltipRect.width / 2;
        break;
      case "left":
        top = targetCenterY - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - gap;
        break;
      case "right":
        top = targetCenterY - tooltipRect.height / 2;
        left = targetRect.right + gap;
        break;
    }

    // Keep tooltip within viewport bounds
    const viewportPadding = 16;
    if (left < viewportPadding) left = viewportPadding;
    if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - tooltipRect.width - viewportPadding;
    }
    if (top < viewportPadding) top = viewportPadding;
    if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
      top = window.innerHeight - tooltipRect.height - viewportPadding;
    }

    // Calculate arrow position to point at target center
    let arrowTop = 0;
    let arrowLeft = 0;
    const arrowSize = 8;

    switch (step.position) {
      case "top":
        arrowTop = tooltipRect.height - 6;
        // Arrow should point at target center, adjusted for tooltip shift
        arrowLeft = Math.max(12, Math.min(tooltipRect.width - 20, targetCenterX - left - arrowSize));
        break;
      case "bottom":
        arrowTop = -6;
        arrowLeft = Math.max(12, Math.min(tooltipRect.width - 20, targetCenterX - left - arrowSize));
        break;
      case "left":
        arrowLeft = tooltipRect.width - 6;
        arrowTop = Math.max(12, Math.min(tooltipRect.height - 20, targetCenterY - top - arrowSize));
        break;
      case "right":
        arrowLeft = -6;
        arrowTop = Math.max(12, Math.min(tooltipRect.height - 20, targetCenterY - top - arrowSize));
        break;
    }

    setPosition({ top, left });
    setArrowPosition({ top: arrowTop, left: arrowLeft });
  }, [step]);

  useEffect(() => {
    if (!step) return;

    // Call onBeforeShow if provided
    step.onBeforeShow?.();

    // Initial position update
    const timer = setTimeout(updatePosition, 50);

    // Update position on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [step, updatePosition]);

  // Handle click on target element for requiresClick steps
  useEffect(() => {
    if (!step?.requiresClick || !step.targetRef?.current) return;

    const targetEl = step.targetRef.current;
    const handleClick = () => {
      // Small delay to let the click action complete
      setTimeout(onNext, 100);
    };

    targetEl.addEventListener("click", handleClick);
    return () => targetEl.removeEventListener("click", handleClick);
  }, [step, onNext]);

  if (!mounted || !step) return null;

  const getArrowClasses = () => {
    const base = "absolute w-4 h-4 bg-primary transform rotate-45";
    switch (step.position) {
      case "top":
        return `${base}`;
      case "bottom":
        return `${base}`;
      case "left":
        return `${base}`;
      case "right":
        return `${base}`;
      default:
        return base;
    }
  };

  return createPortal(
    <>
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="tutorial-spotlight">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - (step.highlightPadding ?? 8)}
                  y={highlightRect.top - (step.highlightPadding ?? 8)}
                  width={highlightRect.width + (step.highlightPadding ?? 8) * 2}
                  height={highlightRect.height + (step.highlightPadding ?? 8) * 2 + (step.highlightExtendBottom ?? 0)}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tutorial-spotlight)"
          />
        </svg>
      </div>

      {/* Clickable overlay that blocks interaction except for highlighted area (only when requiresClick) */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          // Only create a hole in the overlay if the step requires clicking the target
          // For "showNext" steps, block all clicks including on the highlighted area
          clipPath: highlightRect && step.requiresClick
            ? `polygon(
                0% 0%,
                0% 100%,
                ${highlightRect.left - (step.highlightPadding ?? 8)}px 100%,
                ${highlightRect.left - (step.highlightPadding ?? 8)}px ${highlightRect.top - (step.highlightPadding ?? 8)}px,
                ${highlightRect.right + (step.highlightPadding ?? 8)}px ${highlightRect.top - (step.highlightPadding ?? 8)}px,
                ${highlightRect.right + (step.highlightPadding ?? 8)}px ${highlightRect.bottom + (step.highlightPadding ?? 8) + (step.highlightExtendBottom ?? 0)}px,
                ${highlightRect.left - (step.highlightPadding ?? 8)}px ${highlightRect.bottom + (step.highlightPadding ?? 8) + (step.highlightExtendBottom ?? 0)}px,
                ${highlightRect.left - (step.highlightPadding ?? 8)}px 100%,
                100% 100%,
                100% 0%
              )`
            : undefined,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] bg-primary text-white rounded-xl shadow-2xl p-4 max-w-xs animate-[fadeIn_0.2s_ease-out]"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Arrow */}
        <div
          className={getArrowClasses()}
          style={{
            top: arrowPosition.top,
            left: arrowPosition.left,
          }}
        />

        {/* Content */}
        <div className="relative">
          {/* Step indicator - only show if more than 1 step */}
          {totalSteps > 1 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/70">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>
          )}

          <h4 className="font-semibold text-base mb-1">{step.title}</h4>
          <p className="text-sm text-white/90 mb-4">{step.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            {step.showSkip !== false && (
              <button
                onClick={onSkip}
                className="text-xs text-white/70 hover:text-white transition-colors"
              >
                Skip Tutorial
              </button>
            )}
            {step.showNext && !step.requiresClick && (
              <button
                onClick={onNext}
                className="ml-auto px-4 py-1.5 bg-white text-primary text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                Next
              </button>
            )}
            {step.requiresClick && (
              <span className="ml-auto text-xs text-white/70 italic">
                Click the highlighted area to continue
              </span>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
