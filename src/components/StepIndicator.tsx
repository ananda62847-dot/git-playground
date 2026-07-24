import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: { title: string; tamilTitle: string }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, steps }) => {
  return (
    <div className="w-full mb-4 md:mb-8">
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-tvk-maroon to-tvk-yellow transition-all duration-500 ease-out"
            style={{ width: `${((currentStep) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Circles */}
      <div className="flex justify-between mt-3 md:mt-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-tvk-maroon text-primary-foreground'
                    : isCurrent
                    ? 'bg-tvk-yellow text-tvk-maroon-dark ring-2 md:ring-4 ring-tvk-yellow/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : stepNumber}
              </div>
              <div className="mt-1 md:mt-2 text-center">
                <p className={`text-[10px] md:text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.tamilTitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
