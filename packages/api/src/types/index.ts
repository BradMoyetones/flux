export interface WorkflowMetadata {
  last_execution?: string;
  total_executions: number;
}

export type Trigger = 
  | { type: 'manual'; config?: any }
  | { type: 'cron'; expression: string; timezone?: string; starts_at?: string; expires_at?: string; max_runs?: number }
  | { type: 'webhook'; path: string; method?: string };

export interface XYPosition {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  name: string;
  type: string;
  label: string;
  config: any;
  position?: XYPosition;
}

export interface Edge {
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
  path?: string;
  metadata?: WorkflowMetadata;
  trigger: Trigger;
  nodes: Node[];
  edges: Edge[];
}

export type NodeStatus = 'pending' | 'running' | 'success' | 'error';

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

export interface WhatsAppSessionInfo {
  id: string;
  port: number;
  connected?: boolean;
  jid?: string | null;
}

export type Workspace = string;

export interface FluxEntry {
  name: string;
  path: string;
  workspace: string;
}

export interface NotificationConfig {
  desktopEnabled: boolean;
  onFlowSuccess: boolean;
  onFlowError: boolean;
  onSessionDisconnect: boolean;
  sound: boolean;
  quietHours: boolean;
  onlyWhenUnfocused: boolean;
}

export interface GlobalVariable {
  key: string;
  value: string;
  secret: boolean;
}

export interface AppConfig {
  isFirstTime: boolean;
  userName: string;
  theme: string;
  avatarPath: string;
  runInBackground: boolean;
  notifications: NotificationConfig;
  variables: GlobalVariable[];
  workspaces: string[];
  workflowIndex: FluxEntry[];
}

