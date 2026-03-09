"use client";

import { useState, useEffect, useCallback, useMemo, RefObject } from "react";
import { TutorialStep } from "../TutorialTooltip";
import { TutorialPhase } from "../types";
import { MealSessionState } from "@/types/catering.types";

const TUTORIAL_STORAGE_KEY = "catering_tutorial_completed";

interface TutorialRefs {
  addDayNavButtonRef: RefObject<HTMLButtonElement | null>;
  backButtonRef: RefObject<HTMLButtonElement | null>;
  firstDayTabRef: RefObject<HTMLButtonElement | null>;
  firstSessionPillRef: RefObject<HTMLButtonElement | null>;
  addSessionNavButtonRef: RefObject<HTMLButtonElement | null>;
  categoriesRowRef: RefObject<HTMLDivElement | null>;
  restaurantListRef: RefObject<HTMLDivElement | null>;
  firstMenuItemRef: RefObject<HTMLDivElement | null>;
}

interface UseCateringTutorialOptions {
  mealSessions: MealSessionState[];
  refs: TutorialRefs;
}

export function useCateringTutorial({
  mealSessions,
  refs,
}: UseCateringTutorialOptions) {
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tutorialPhase, setTutorialPhase] = useState<TutorialPhase>("initial");

  // Tutorial initialization - check if tutorial has been completed
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (tutorialCompleted) {
      // Tutorial was completed before, mark as completed
      setTutorialPhase("completed");
      setTutorialStep(null);
    } else if (
      mealSessions.length === 1 &&
      mealSessions[0].orderItems.length === 0
    ) {
      // Start tutorial if not completed and cart is empty
      setTutorialPhase("navigation");
      setTutorialStep(0);
    } else {
      // Has items but never completed tutorial - mark as completed so help button shows
      setTutorialPhase("completed");
      setTutorialStep(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tutorial step definitions for each phase
  const getTutorialSteps = useCallback((): TutorialStep[] => {
    switch (tutorialPhase) {
      case "initial":
        return [];

      case "navigation":
        if (!refs.backButtonRef.current) {
          return [
            {
              id: "day-tab",
              targetRef: refs.firstDayTabRef,
              title: "Select a Day",
              description:
                "Click on a day to view the sessions scheduled for that day.",
              position: "bottom",
              requiresClick: true,
              showSkip: true,
            },
            {
              id: "session-pill",
              targetRef: refs.firstSessionPillRef,
              title: "Go to Session",
              description:
                "Click on a meal session to jump directly to that session's menu order.",
              position: "bottom",
              requiresClick: true,
              showSkip: true,
            },
          ];
        }

        return [
          {
            id: "back-button",
            targetRef: refs.backButtonRef,
            title: "View Your Days",
            description:
              "Click the back button to see all the days in your order.",
            position: "bottom",
            requiresClick: true,
            showSkip: true,
          },
          {
            id: "session-pill",
            targetRef: refs.firstSessionPillRef,
            title: "Go to Session",
            description:
              "Click on a meal session to jump directly to that session's menu order.",
            position: "bottom",
            requiresClick: true,
            showSkip: true,
          },
          {
            id: "add-session-nav",
            targetRef: refs.addSessionNavButtonRef,
            title: "Add More Sessions",
            description:
              "You can add more meal sessions to this day by clicking here.",
            position: "bottom",
            showNext: true,
            showSkip: true,
          },
          {
            id: "back-button-return",
            targetRef: refs.backButtonRef,
            title: "Back to Days",
            description:
              "Click the back button to return to the full list of delivery days.",
            position: "bottom",
            requiresClick: true,
            showSkip: true,
          },
        ];

      case "days_overview":
        return [
          {
            id: "add-day-nav",
            targetRef: refs.addDayNavButtonRef,
            title: "Add More Days",
            description: "You can add more days to your order by clicking here.",
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
            highlightExtendBottom: 50, // Extend to cover subcategories row below
          },
        ];

      case "restaurants":
        return [
          {
            id: "restaurants",
            targetRef: refs.restaurantListRef,
            title: "Choose a Restaurant",
            description:
              "Browse the restaurants available for this session, then click into any restaurant to view its menu.",
            position: "bottom",
            requiresClick: true,
            showSkip: true,
            highlightPadding: 12,
            highlightMinTop: 72,
            onBeforeShow: () => {
              const restaurantList = refs.restaurantListRef.current;
              if (!restaurantList) return;

              const stickyOffset = 72;
              const rect = restaurantList.getBoundingClientRect();
              const distanceFromTarget = rect.top - stickyOffset;
              if (Math.abs(distanceFromTarget) < 4) return;

              window.scrollTo({
                top: window.scrollY + distanceFromTarget,
                behavior: "auto",
              });
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
            onBeforeShow: () => {
              const firstMenuItem = refs.firstMenuItemRef.current;
              if (!firstMenuItem) return;

              const stickyOffset = 72;
              const rect = firstMenuItem.getBoundingClientRect();

              if (rect.top >= stickyOffset) return;

              window.scrollTo({
                top: window.scrollY + rect.top - stickyOffset,
                behavior: "auto",
              });
            },
          },
        ];

      default:
        return [];
    }
  }, [tutorialPhase, refs]);

  // Get current tutorial step
  const currentTutorialStep = useMemo(() => {
    if (tutorialStep === null || tutorialPhase === "completed") return null;
    const steps = getTutorialSteps();
    return steps[tutorialStep] || null;
  }, [tutorialStep, tutorialPhase, getTutorialSteps]);

  // Handle tutorial next step
  const handleTutorialNext = useCallback(() => {
    const steps = getTutorialSteps();
    const nextStep = (tutorialStep ?? 0) + 1;

    if (currentTutorialStep?.id === "back-button-return") {
      setTutorialPhase("days_overview");
      setTutorialStep(0);
      return;
    }

    if (nextStep >= steps.length) {
      // Move to next phase or complete
      switch (tutorialPhase) {
        case "initial":
          setTutorialPhase("navigation");
          setTutorialStep(0);
          break;
        case "navigation":
          // Move to categories phase
          setTutorialPhase("categories");
          setTutorialStep(0);
          break;
        case "days_overview":
          // Move to categories phase
          setTutorialPhase("categories");
          setTutorialStep(0);
          break;
        case "categories":
          // Move to restaurant selection phase
          setTutorialPhase("restaurants");
          setTutorialStep(0);
          break;
        case "restaurants":
          // Move to menu items phase
          setTutorialPhase("menu_items");
          setTutorialStep(0);
          break;
        case "menu_items":
          // Tutorial complete
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

  // Handle skip tutorial
  const handleSkipTutorial = useCallback(() => {
    setTutorialPhase("completed");
    setTutorialStep(null);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  }, []);

  // Trigger navigation tutorial after day is created
  const triggerNavigationTutorial = useCallback(() => {
    // Small delay to allow UI to update
    setTimeout(() => {
      setTutorialPhase("navigation");
      setTutorialStep(0);
    }, 500);
  }, []);

  // Reset tutorial
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
    resetTutorial,
    getTutorialSteps,
  };
}
