import { z } from 'zod';

// ──── Autenticación ────
const httpBasicAuth = z.object({
  type: z.literal('basic'),
  username: z.string(),
  password: z.string(),
});

const httpBearerAuth = z.object({
  type: z.literal('bearer'),
  token: z.string(),
});

const httpApiKeyAuth = z.object({
  type: z.literal('apiKey'),
  key: z.string(),
  value: z.string(),
  location: z.enum(['header', 'queryParam']),
});

const httpAuthSchema = z.discriminatedUnion('type', [httpBasicAuth, httpBearerAuth, httpApiKeyAuth]);

// ──── Proxy ────
const httpProxySchema = z.object({
  url: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional(),
});

// ──── Schema Principal ────
export const httpNodeSchema = z.object({
  // Basics
  url: z.string().min(1, "URL requerida"),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),

  // Headers
  headers: z.record(z.string(), z.string()).optional().default({}),

  // Body
  body: z.string().optional(),
  contentType: z.enum([
    'application/json',
    'application/x-www-form-urlencoded',
    'text/plain',
    'text/xml',
    'multipart/form-data',
    'application/octet-stream',
  ]).optional().default('application/json'),

  // Auth
  auth: httpAuthSchema.optional(),

  // Behavior
  timeoutMs: z.number().int().positive().optional().default(30000),
  maxRedirects: z.number().int().min(0).optional().default(10),
  followRedirects: z.boolean().optional().default(true),

  // SSL
  ignoreSslErrors: z.boolean().optional().default(false),

  // Proxy
  proxy: httpProxySchema.optional(),

  // Query Params
  queryParams: z.record(z.string(), z.string()).optional().default({}),

  // Response
  responseType: z.enum(['auto', 'json', 'text', 'binary']).optional().default('auto'),

  // Retry
  retryCount: z.number().int().min(0).optional().default(0),
  retryDelayMs: z.number().int().positive().optional().default(1000),

  // Cookies
  persistCookies: z.boolean().optional().default(false),
});

export type HttpNodeConfig = z.infer<typeof httpNodeSchema>;

export const httpNodeDefaultConfig: HttpNodeConfig = {
  url: '',
  method: 'GET',
  headers: {},
  contentType: 'application/json',
  timeoutMs: 30000,
  maxRedirects: 10,
  followRedirects: true,
  ignoreSslErrors: false,
  queryParams: {},
  responseType: 'auto',
  retryCount: 0,
  retryDelayMs: 1000,
  persistCookies: false,
};
