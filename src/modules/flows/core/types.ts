export type NodeStatus = 'pending' | 'running' | 'success' | 'error';

export interface WorkflowTrigger {
  type: string;
  config?: Record<string, any>;
}

export interface WorkflowNodeConfig {
  [key: string]: any;
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  config: WorkflowNodeConfig;
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
  trigger: WorkflowTrigger;
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
