"use client";

import React, { useState, useEffect, useCallback, useMemo, RefObject } from "react";
import { TutorialStep } from "../TutorialTooltip";
import { TutorialPhase } from "../types";
import { MealSessionState } from "@/types/catering.types";

const TUTORIAL_STORAGE_KEY = "catering_tutorial_completed";

interface TutorialRefs {
  addSessionNavButtonRef: RefObject<HTMLButtonElement | null>;
  firstSessionPillRef: RefObject<HTMLButtonElement | null>;
  categoriesRowRef: RefObject<HTMLDivElement | null>;
  restaurantListRef: RefObject<HTMLDivElement | null>;
  firstMenuItemRef: RefObject<HTMLDivElement | null>;
  resetRestaurantListRef: React.MutableRefObject<(() => void) | null>;
  // kept for DateSessionNav prop compatibility
  addDayNavButtonRef: RefObject<HTMLButtonElement | null>;
  backButtonRef: RefObject<HTMLButtonElement | null>;
  firstDayTabRef: RefObject<HTMLDivElement | null>;
}

interface UseCateringTutorialOptions {
  mealSessions: MealSessionState[];
  navMode: "dates" | "sessions";
  refs: TutorialRefs;
}

export function useCateringTutorial({
  mealSessions,
  refs,
}: UseCateringTutorialOptions) {
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tutorialPhase, setTutorialPhase] = useState<TutorialPhase>("navigation");

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (tutorialCompleted) {
      setTutorialPhase("completed");
      setTutorialStep(null);
    } else if (
      mealSessions.length === 1 &&
      mealSessions[0].orderItems.length === 0
    ) {
      setTutorialPhase("navigation");
      setTutorialStep(0);
    } else {
      setTutorialPhase("completed");
      setTutorialStep(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTutorialSteps = useCallback((): TutorialStep[] => {
    switch (tutorialPhase) {
      case "navigation":
        return [
          {
            id: "add-session-nav",
            targetRef: refs.addSessionNavButtonRef,
            title: "Add a Session",
            description:
              "Start by adding a meal session — set the date, time, and name for your catering delivery.",
            position: "bottom",
            requiresClick: true,
            showSkip: true,
          },
          {
            id: "session-pill",
            targetRef: refs.firstSessionPillRef,
            title: "Your Meal Session",
            description:
              "Click on a session pill to switch between sessions and view or build each meal's order.",
            position: "bottom",
            showNext: true,
            showSkip: true,
          },
        ];

      case "categories":
        return [
          {
            id: "categories",
            targetRef: refs.categoriesRowRef,
            title: "Browse Categories",
            description:
              "Browse food items by category. Click on a category to see the available options.",
            position: "bottom",
            showNext: true,
            showSkip: true,
            highlightPadding: 12,
            highlightExtendBottom: 50,
            onBeforeShow: (onComplete) => {
              refs.resetRestaurantListRef.current?.();
              setTimeout(() => {
                const el = refs.categoriesRowRef.current;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  if (rect.top < 72 || rect.top > window.innerHeight / 2) {
                    window.scrollTo({ top: window.scrollY + rect.top - 72, behavior: "instant" });
                  }
                }
                onComplete();
              }, 50);
            },
          },
        ];

      case "restaurants":
        return [
          {
            id: "restaurants",
            targetRef: refs.restaurantListRef,
            title: "Choose a Restaurant",
            description:
              "Browse available restaurants for this session, then click into one to view its menu.",
            position: "bottom",
            requiresClick: true,
            showSkip: true,
            highlightPadding: 12,
            highlightMinTop: 72,
            onBeforeShow: (onComplete) => {
              refs.resetRestaurantListRef.current?.();
              setTimeout(() => {
                const el = refs.restaurantListRef.current;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  if (Math.abs(rect.top - 72) > 4) {
                    window.scrollTo({ top: window.scrollY + rect.top - 72, behavior: "instant" });
                  }
                }
                onComplete();
              }, 50);
            },
          },
        ];

      case "menu_items":
        return [
          {
            id: "menu-item",
            targetRef: refs.firstMenuItemRef,
            title: "Add Items to Your Order",
            description:
              "Click on a menu item card to see more details, or click the + button to quickly add it to your session.",
            position: "top",
            showNext: true,
            nextLabel: "Finish Tutorial",
            showSkip: false,
            highlightPadding: 8,
            highlightMinTop: 72,
            onBeforeShow: (onComplete) => {
              let attempts = 0;
              const scrollToItem = () => {
                const el = refs.firstMenuItemRef.current;
                if (!el) {
                  if (attempts < 20) { attempts++; setTimeout(scrollToItem, 150); }
                  else onComplete();
                  return;
                }
                const stickyOffset = 72 + 16;
                const rect = el.getBoundingClientRect();
                window.scrollTo({ top: window.scrollY + rect.top - stickyOffset, behavior: "instant" });
                onComplete();
              };
              scrollToItem();
            },
          },
        ];

      default:
        return [];
    }
  }, [tutorialPhase, refs]);

  const currentTutorialStep = useMemo(() => {
    if (tutorialStep === null || tutorialPhase === "completed") return null;
    const steps = getTutorialSteps();
    return steps[tutorialStep] || null;
  }, [tutorialStep, tutorialPhase, getTutorialSteps]);

  const handleTutorialNext = useCallback(() => {
    // When user clicks "Add Session", hide tutorial completely until session is saved
    if (currentTutorialStep?.id === "add-session-nav") {
      setTutorialStep(null);
      return;
    }

    const steps = getTutorialSteps();
    const nextStep = (tutorialStep ?? 0) + 1;

    if (nextStep >= steps.length) {
      switch (tutorialPhase) {
        case "navigation":
          setTutorialPhase("categories");
          setTutorialStep(0);
          break;
        case "categories":
          setTutorialPhase("restaurants");
          setTutorialStep(0);
          break;
        case "restaurants":
          setTutorialPhase("menu_items");
          setTutorialStep(0);
          break;
        case "menu_items":
          setTutorialPhase("completed");
          setTutorialStep(null);
          localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
          break;
        default:
          break;
      }
    } else {
      setTutorialStep(nextStep);
    }
  }, [currentTutorialStep, tutorialStep, tutorialPhase, getTutorialSteps]);

  const handleSkipTutorial = useCallback(() => {
    setTutorialPhase("completed");
    setTutorialStep(null);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  }, []);

  const triggerNavigationTutorial = useCallback(() => {
    setTimeout(() => {
      setTutorialPhase("navigation");
      setTutorialStep(0);
    }, 500);
  }, []);

  // Advance past the "add session" step once a session is actually saved
  const triggerSessionCreated = useCallback(() => {
    setTimeout(() => {
      if (tutorialPhase === "navigation") {
        setTutorialStep(1);
      }
    }, 300);
  }, [tutorialPhase]);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setTutorialPhase("navigation");
    setTutorialStep(0);
  }, []);

  return {
    tutorialStep,
    tutorialPhase,
    currentTutorialStep,
    handleTutorialNext,
    handleSkipTutorial,
    triggerNavigationTutorial,
    triggerSessionCreated,
    resetTutorial,
    getTutorialSteps,
  };
}
