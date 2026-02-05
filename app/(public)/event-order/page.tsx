"use client";

import { CateringProvider, useCatering } from "@/context/CateringContext";
import { CateringFilterProvider } from "@/context/CateringFilterContext";
import CateringOrderBuilder from "@/lib/components/catering/CateringOrderBuilder";
import Step3ContactInfo from "@/lib/components/catering/Step3ContactDetails";

function CateringSteps() {
  const {
    currentStep,
    // setCurrentStep
  } = useCatering();

  const steps = [
    { label: "Menu Selection", step: 1 },
    { label: "Contact & Delivery", step: 2 },
  ];

  return (
    <div className="min-h-screen">
      <div className="py-2 max-w mx-auto bg-base-100">
        {currentStep !== 1 && (
          <div className="my-10 mr-10 ml-10 max-w mx-auto">
            <div className="text-sm text-gray-500 mb-2">
              Step {currentStep} of 2
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-dark-pink rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 font-medium flex items-center gap-2">
              {steps.map((s, idx) => (
                <div key={s.step} className="flex items-center gap-2">
                  <button
                    disabled={true}
                    type="button"
                    className={`underline-offset-2 font-medium transition-colors ${
                      currentStep === s.step
                        ? "text-dark-pink cursor-default"
                        : "text-gray-600" //hover:text-dark-pink hover:underline cursor-pointer
                    }`}
                    // onClick={() => setCurrentStep(s.step)}
                  >
                    {s.label}
                  </button>
                  {idx < steps.length - 1 && (
                    <span className="text-gray-400">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-base-100 rounded-lg max-w-none">
          {currentStep === 1 && <CateringOrderBuilder />}
          {currentStep === 2 && <Step3ContactInfo />}
        </div>
      </div>
    </div>
  );
}

export default function CateringPage() {
  return (
    <CateringProvider>
      <CateringFilterProvider>
        <CateringSteps />
      </CateringFilterProvider>
    </CateringProvider>
  );
}
