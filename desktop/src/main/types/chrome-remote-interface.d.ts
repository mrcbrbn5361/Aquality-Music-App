declare module 'chrome-remote-interface' {
  export interface CDPCookie {
    name: string;
    value: string;
    domain: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    expires?: number;
  }

  export interface CDPEvaluateResult {
    result?: {
      type?: string;
      value?: unknown;
    };
    exceptionDetails?: unknown;
  }

  export interface CDPClient {
    Network: {
      getCookies(params?: { urls?: string[] }): Promise<{ cookies: CDPCookie[] }>;
    };
    Runtime: {
      evaluate(params: { expression: string; returnByValue?: boolean }): Promise<CDPEvaluateResult>;
      enable(): Promise<void>;
    };
    Page: {
      enable(): Promise<void>;
      navigate(params: { url: string }): Promise<unknown>;
    };
    close(): Promise<void>;
  }

  export interface CDPOptions {
    host?: string;
    port?: number;
    target?: string;
    local?: boolean;
  }

  export default function CDP(options?: CDPOptions): Promise<CDPClient>;
  export function List(options?: CDPOptions): Promise<Array<{ id: string; url: string; title: string }>>;
}
