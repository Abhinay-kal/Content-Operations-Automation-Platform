import React from 'react';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

interface WorkflowStepperProps {
    currentState: string;
}

const STAGES = [
    { key: 'CREATED', matches: ['NEW', 'STALE'] },
    { key: 'AUDIT', matches: ['AUDIT_PENDING', 'AUDITING', 'AUDIT_COMPLETE'] },
    { key: 'REWRITE', matches: ['REWRITE_PENDING', 'REWRITING', 'REWRITE_COMPLETE'] },
    { key: 'REVIEW', matches: ['REVIEW_PENDING'] },
    { key: 'DONE', matches: ['PUBLISHED'] }
];

export function WorkflowStepper({ currentState }: WorkflowStepperProps) {
    // Determine the current index based on state
    let activeIndex = 0;
    if (['AUDIT_PENDING', 'AUDITING', 'AUDIT_COMPLETE'].includes(currentState)) activeIndex = 1;
    if (['REWRITE_PENDING', 'REWRITING', 'REWRITE_COMPLETE'].includes(currentState)) activeIndex = 2;
    if (['REVIEW_PENDING'].includes(currentState)) activeIndex = 3;
    if (['PUBLISHED'].includes(currentState)) activeIndex = 4;
    
    // Check if failed
    const isFailed = currentState === 'FAILED' || currentState === 'ARCHIVED';

    return (
        <div className="flex items-center space-x-2 overflow-x-auto p-4 bg-gray-50 border rounded-lg">
            {STAGES.map((stage, i) => {
                const isCompleted = i < activeIndex;
                const isActive = i === activeIndex;
                
                let textColor = 'text-gray-400';
                let icon = <Circle size={20} />;
                
                if (isCompleted) {
                    textColor = 'text-green-600';
                    icon = <CheckCircle size={20} />;
                } else if (isActive && !isFailed) {
                    textColor = 'text-blue-600 font-semibold';
                    icon = <Circle size={20} className="fill-current" />;
                } else if (isActive && isFailed) {
                    textColor = 'text-red-600 font-semibold';
                    icon = <Circle size={20} className="fill-current" />;
                }

                return (
                    <React.Fragment key={stage.key}>
                        <div className={`flex items-center gap-2 ${textColor}`}>
                            {icon}
                            <span className="text-sm whitespace-nowrap">{stage.key}</span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <ArrowRight size={16} className="text-gray-300" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
