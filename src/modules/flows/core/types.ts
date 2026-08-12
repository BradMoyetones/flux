import type { Trigger } from "@/types/data";

export type NodeStatus = 'pending' | 'running' | 'success' | 'error';

export interface WorkflowNodeConfig {
  [key: string]: any;
}

export interface XYPosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  label: string;
  config: WorkflowNodeConfig;
  position?: XYPosition;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: Trigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface NodeExecutionEvent {
  workflow_id: string;
  node_id: string;
  status: NodeStatus;
  result?: any;
  error?: string;
}

export interface WorkflowExecutionEvent {
  workflow_id: string;
  status: NodeStatus;
}
