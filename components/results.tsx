"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircleIcon, ChevronRightIcon } from "lucide-react";
import { useState, Fragment } from "react";
import type { AggregatedResult } from "@/lib/get-aggregated-results";

interface ResultsProps {
  results: AggregatedResult[];
}

export function Results({ results }: ResultsProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Visibility Results</h2>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="text-center">Visible</TableHead>
              <TableHead className="text-center">Avg Position</TableHead>
              <TableHead className="text-center">Success Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, i) => (
              <Fragment key={i}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(i)}
                >
                  <TableCell>
                    <ChevronRightIcon
                      className={`size-4 transition-transform ${
                        expandedRows.has(i) ? "rotate-90" : ""
                      }`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{result.model}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {result.question}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.visible ? (
                      <CheckCircleIcon className="size-4 text-green-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.position ? (
                      <span className="font-mono">#{result.position}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-sm">{result.runs}</span>
                      {result.failedCount > 0 && (
                        <span className="text-xs text-red-600">
                          ({result.failedCount} failed)
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRows.has(i) && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 p-4">
                      <div className="space-y-3 max-w-[80vw]">
                        <h4 className="text-sm font-medium">
                          LLM Responses ({result.answers.length} runs)
                        </h4>
                        {result.answers.length > 0 ? (
                          <div className="space-y-2">
                            {result.answers.map((answer, idx) => (
                              <div
                                key={idx}
                                className="border rounded-lg p-3 bg-background"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    Run {idx + 1}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed max-w-[80vw] break-words whitespace-normal">
                                  {answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No responses yet
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
