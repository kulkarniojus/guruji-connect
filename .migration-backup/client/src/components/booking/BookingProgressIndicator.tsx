import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BookingStep {
  id: number;
  label: string;
  description?: string;
}

interface BookingProgressIndicatorProps {
  steps: BookingStep[];
  currentStep: number;
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BookingProgressIndicator({
  steps,
  currentStep,
  variant = 'horizontal',
  size = 'md',
  className,
}: BookingProgressIndicatorProps) {
  const sizeClasses = {
    sm: { circle: 'w-8 h-8', text: 'text-xs', icon: 'w-3 h-3' },
    md: { circle: 'w-10 h-10', text: 'text-sm', icon: 'w-4 h-4' },
    lg: { circle: 'w-12 h-12', text: 'text-base', icon: 'w-5 h-5' },
  };

  const sizes = sizeClasses[size];

  if (variant === 'vertical') {
    return (
      <div className={cn('flex flex-col gap-0', className)}>
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? 'rgb(34, 197, 94)'
                      : isActive
                      ? 'rgb(59, 130, 246)'
                      : 'rgb(229, 231, 235)',
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={cn(
                    sizes.circle,
                    'rounded-full flex items-center justify-center font-semibold text-white shadow-md',
                    !isCompleted && !isActive && 'text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                    >
                      <Check className={sizes.icon} />
                    </motion.div>
                  ) : (
                    <span className={sizes.text}>{step.id}</span>
                  )}
                </motion.div>
                {!isLast && (
                  <div className="relative w-0.5 h-12 mt-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{
                        height: isCompleted ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="absolute top-0 left-0 w-full bg-green-500 rounded-full"
                    />
                  </div>
                )}
              </div>
              <div className="pt-2 pb-6">
                <motion.p
                  initial={false}
                  animate={{
                    color: isActive ? 'rgb(59, 130, 246)' : isCompleted ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  className={sizes.text}
                >
                  {step.label}
                </motion.p>
                {step.description && (
                  <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isCompleted
                      ? 'rgb(34, 197, 94)'
                      : isActive
                      ? 'rgb(59, 130, 246)'
                      : 'rgb(229, 231, 235)',
                    boxShadow: isActive
                      ? '0 0 0 4px rgba(59, 130, 246, 0.2)'
                      : isCompleted
                      ? '0 0 0 4px rgba(34, 197, 94, 0.2)'
                      : '0 0 0 0px transparent',
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={cn(
                    sizes.circle,
                    'rounded-full flex items-center justify-center font-semibold relative z-10',
                    isCompleted || isActive ? 'text-white' : 'text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <Check className={sizes.icon} />
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={false}
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      className={sizes.text}
                    >
                      {step.id}
                    </motion.span>
                  )}
                </motion.div>

                <motion.p
                  initial={false}
                  animate={{
                    color: isActive
                      ? 'rgb(59, 130, 246)'
                      : isCompleted
                      ? 'rgb(34, 197, 94)'
                      : 'rgb(107, 114, 128)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  className={cn(sizes.text, 'mt-2 text-center whitespace-nowrap')}
                >
                  {step.label}
                </motion.p>
              </div>

              {!isLast && (
                <div className="absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2">
                  <div className="w-full h-full bg-gray-200 rounded-full">
                    <motion.div
                      initial={false}
                      animate={{
                        width: isCompleted ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="h-full bg-green-500 rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const defaultBookingSteps: BookingStep[] = [
  { id: 1, label: 'Service', description: 'Select a puja' },
  { id: 2, label: 'Schedule', description: 'Pick date & time' },
  { id: 3, label: 'Guruji', description: 'Choose your guide' },
  { id: 4, label: 'Details', description: 'Your information' },
  { id: 5, label: 'Payment', description: 'Complete booking' },
];

export const mobileBookingSteps: BookingStep[] = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Guruji' },
  { id: 3, label: 'Date' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Payment' },
  { id: 6, label: 'Done' },
];
