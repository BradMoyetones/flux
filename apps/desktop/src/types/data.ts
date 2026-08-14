export interface WorkflowMetadata {
    last_execution?: string;
    total_executions: number;
}

export interface FluxEntry {
    name: string;
    path: string;
    workspace: string;
    metadata?: WorkflowMetadata;
}

export type Workspace = string;

export type Trigger =
  | { type: 'manual' }
  | { type: 'webhook'; path: string; method: string }
  | { type: 'cron'; expression: string; timezone?: string; starts_at?: string; expires_at?: string; max_runs?: number };

export interface WhatsAppSessionInfo {
    id: string;
    port: number;
    connected: boolean;
    jid: string | null;
}

export type NodeType = "http" | "whatsapp" | "transform" | "trigger" | "delay";

export interface WorkflowNodeSummary {
    id: string;
    name: string;
    type: NodeType;
    label: string;
}

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "violet" | "blue" | "emerald" | "amber" | "rose";
export type UiDensity = "comfortable" | "compact";

export interface AppearanceConfig {
    theme: ThemeMode;
    accent: AccentColor;
    density: UiDensity;
    reduceMotion: boolean;
    monoEditorFont: boolean;
    sidebarCollapsed: boolean;
}

export type RunMode = "manual" | "scheduled" | "auto";

export interface WorkflowConfig {
    id: string;
    name: string;
    workspace: string;
    path: string;
    description: string;
    metadata?: WorkflowMetadata;
    enabled: boolean;
    runMode: RunMode;
    cron: string;
    timezone: string;
    concurrency: number;
    timeoutSec: number;
    retryOnFail: boolean;
    maxRetries: number;
    saveExecutionLog: boolean;
    notifyOnError: boolean;
    color: AccentColor;
    nodes: WorkflowNodeSummary[];
    lastRun: string | null;
    lastStatus: "ok" | "error" | "never";
    runsThisWeek: number;
}

export interface WorkspaceConfig {
    id: string;
    name: string;
    slug: string;
    color: AccentColor;
    description: string;
    workflows: WorkflowConfig[];
}

export interface WaSessionConfig extends WhatsAppSessionInfo {
    label: string;
    phone: string | null;
    boundWorkflowId: string | null;
    boundNodeId: string | null;
    reusable: boolean;
    lastActivity: string | null;
    messagesSent: number;
    contactsCount: number;
    chatsCount: number;
}

export interface AutomationDefaults {
    httpTimeoutMs: number;
    httpRetryCount: number;
    httpRetryDelayMs: number;
    persistCookies: boolean;
    ignoreSslErrors: boolean;
    followRedirects: boolean;
    maxRedirects: number;
    defaultContentType: string;
}

export interface GlobalVariable {
    key: string;
    value: string;
    secret: boolean;
}

export interface NotificationConfig {
    desktopEnabled: boolean;
    onFlowSuccess: boolean;
    onFlowError: boolean;
    onSessionDisconnect: boolean;
    sound: boolean;
    quietHours: boolean;
}

export interface UserProfile {
    displayName: string;
    handle: string;
    email: string;
    avatarUrl: string;
    bio: string;
    onboardingCompleted: boolean;
}

