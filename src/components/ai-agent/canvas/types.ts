export type CanvasNodeType = "trigger" | "agent" | "action" | "condition" | "delay" | "split" | "merge" | "report";

export interface TriggerData {
  triggerType: "manual" | "schedule" | "webhook" | "event";
  cronExpression?: string;
  eventName?: string;
}

export interface AgentData {
  agentName: string;
  agentInstructions: string;
  prompt: string;
  emoji: string;
}

export interface ActionData {
  actionType: "email" | "whatsapp" | "webhook" | "notification";
  destination?: string;
  template?: string;
}

export interface ConditionData {
  field: string;
  operator: "contains" | "not_contains" | "equals" | "gt" | "lt" | "exists";
  value: string;
}

export interface DelayData {
  delaySeconds: number;
  delayUnit: "seconds" | "minutes" | "hours";
}

export interface SplitData {
  splitType: "parallel" | "round_robin";
}

export interface MergeData {
  mergeType: "wait_all" | "wait_any";
}

export interface ReportData {
  reportName: string;
  channels: ("email" | "whatsapp")[];
  recipients: { name: string; email?: string; phone?: string }[];
  template?: string;
}

export type CanvasNodeData = {
  label: string;
  nodeType: CanvasNodeType;
  config: TriggerData | AgentData | ActionData | ConditionData | DelayData | SplitData | MergeData | ReportData;
  executionStatus?: "idle" | "waiting" | "running" | "success" | "error" | "skipped";
  executionResult?: string;
  hierarchyDepth?: number;
  roleId?: string;
};

export interface SavedCanvasWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  enabled: boolean;
}
