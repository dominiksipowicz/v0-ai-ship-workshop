"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  CheckCircleIcon,
  DatabaseIcon,
  MessageSquareIcon,
  SearchIcon,
  LoaderIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import type { RunStatus } from "@/lib/upstash";

interface AgentProgressProps {
  status: RunStatus;
}

export function AgentProgress({ status }: AgentProgressProps) {
  const [isContextOpen, setIsContextOpen] = useState(false);

  return (
    <div className="space-y-6">
      <ChainOfThought defaultOpen>
        <ChainOfThoughtHeader>Agent Progress</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          {/* Step 1: Create Master Context */}
          <ChainOfThoughtStep
            icon={DatabaseIcon}
            label="Create master context"
            status={
              status.context
                ? "complete"
                : status.status === "pending"
                ? "active"
                : "pending"
            }
          >
            {status.context && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Generated comprehensive brand context for {status.brand}
                </p>

                <Collapsible
                  open={isContextOpen}
                  onOpenChange={setIsContextOpen}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <span>View master context</span>
                    <ChevronDownIcon
                      className={`size-4 transition-transform ${
                        isContextOpen ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 max-w-[80vw]">
                    <CodeBlock code={status.context.context} language="text">
                      <CodeBlockCopyButton />
                    </CodeBlock>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </ChainOfThoughtStep>

          {/* Step 2: Generate Questions */}
          <ChainOfThoughtStep
            icon={MessageSquareIcon}
            label="Generate AEO-optimized questions"
            status={
              status.questions
                ? "complete"
                : status.status === "context"
                ? "active"
                : status.context
                ? "pending"
                : "pending"
            }
          >
            {status.questions && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Created {status.questions.length} natural questions users
                  would ask AI assistants
                </p>
                <div className="space-y-2">
                  {status.questions.map((q) => (
                    <Suggestion
                      key={q.id}
                      suggestion={q.question}
                      className="cursor-default"
                    />
                  ))}
                </div>
              </div>
            )}
          </ChainOfThoughtStep>

          {/* Step 3: Check Visibility */}
          <ChainOfThoughtStep
            icon={SearchIcon}
            label="Check visibility across models"
            status={
              status.completedAnswers === 27
                ? "complete"
                : status.status === "checking"
                ? "active"
                : status.questions
                ? "pending"
                : "pending"
            }
          >
            {status.answers.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {status.completedAnswers === 27 ? "Completed" : "Running"}{" "}
                  visibility checks across 3 models
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {status.completedAnswers === 27 ? (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  ) : (
                    <LoaderIcon className="size-4 animate-spin" />
                  )}
                  <span className="text-muted-foreground">
                    Checked {status.completedAnswers} / {status.totalAnswers}{" "}
                    LLM calls
                  </span>
                </div>
              </div>
            )}
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  );
}
