const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.detail || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type SourceType = "file" | "image" | "text" | "link" | "video";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  media_type?: string;
  chunk_count?: number;
  created_at?: string;
}

export interface SourceListResponse {
  sources: Source[];
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  source_ids?: string[];
}

export interface SessionListResponse {
  sessions: Session[];
}

export interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface MessageListResponse {
  messages: Message[];
}

export interface Citation {
  id: string;
  label: string;
  sourceName: string;
  content: string;
  page?: number;
  relevance: number;
}

export interface ChatResponse {
  message: Message;
  title: string;
  answer: string;
  extractive_summary: string[];
  citations: Citation[];
  follow_ups: string[];
}

export const api = {
  auth: {
    register: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
      return fetchApi<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
      return fetchApi<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    me: async (token: string): Promise<ApiResponse<User>> => {
      return fetchApi<User>("/api/auth/me", {}, token);
    },
  },

  sources: {
    upload: async (file: File, token: string): Promise<ApiResponse<Source>> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/sources`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || "Upload failed" };
      }

      const data = await response.json();
      return { data };
    },

    uploadText: async (title: string, content: string, token: string): Promise<ApiResponse<Source>> => {
      return fetchApi<Source>("/api/sources/text", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      }, token);
    },

    uploadLink: async (url: string, token: string): Promise<ApiResponse<Source>> => {
      return fetchApi<Source>("/api/sources/link", {
        method: "POST",
        body: JSON.stringify({ url }),
      }, token);
    },

    list: async (token: string): Promise<ApiResponse<SourceListResponse>> => {
      return fetchApi<SourceListResponse>("/api/sources", {}, token);
    },

    delete: async (sourceId: string, token: string): Promise<ApiResponse<void>> => {
      return fetchApi<void>(`/api/sources/${sourceId}`, {
        method: "DELETE",
      }, token);
    },
  },

  chat: {
    createSession: async (title?: string, sourceIds?: string[], token?: string): Promise<ApiResponse<Session>> => {
      return fetchApi<Session>("/api/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title, source_ids: sourceIds }),
      }, token);
    },

    listSessions: async (token: string): Promise<ApiResponse<SessionListResponse>> => {
      return fetchApi<SessionListResponse>("/api/chat/sessions", {}, token);
    },

    getMessages: async (sessionId: string, token: string): Promise<ApiResponse<MessageListResponse>> => {
      return fetchApi<MessageListResponse>(`/api/chat/sessions/${sessionId}`, {}, token);
    },

    sendMessage: async (
      sessionId: string,
      message: string,
      token: string,
      sourceIds?: string[]
    ): Promise<ApiResponse<ChatResponse>> => {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message, source_ids: sourceIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || "Failed to send message" };
      }

      const data = await response.json();
      return { data };
    },

    deleteSession: async (sessionId: string, token: string): Promise<ApiResponse<void>> => {
      return fetchApi<void>(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
      }, token);
    },

    sendMessageStream: async function* (
      sessionId: string,
      message: string,
      token: string,
      sourceIds?: string[],
      signal?: AbortSignal
    ): AsyncGenerator<{ content: string; done: boolean }> {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message, source_ids: sourceIds }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                yield data;
                if (data.done) return;
              } catch (e) {
                // Skip malformed SSE data
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    trackFollowUp: async (
      messageId: string,
      originalQuestion: string,
      followUpClicked: string,
      token: string
    ): Promise<ApiResponse<void>> => {
      return fetchApi<void>("/api/chat/track-follow-up", {
        method: "POST",
        body: JSON.stringify({
          message_id: messageId,
          original_question: originalQuestion,
          follow_up_clicked: followUpClicked,
        }),
      }, token);
    },
  },
};
