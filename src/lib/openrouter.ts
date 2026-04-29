export interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterJsonCompletionParams {
  model: string;
  systemPrompt: string;
  userMessage: string;
  apiKey?: string;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterCompletionResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
}

/**
 * Calls OpenRouter chat completions endpoint and parses a strict JSON payload.
 */
export async function generateOpenRouterJsonResponse<T>(
  params: OpenRouterJsonCompletionParams
): Promise<T> {
  const apiKey = params.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }

  const body = {
    model: params.model,
    messages: [
      {
        role: "system",
        content: params.systemPrompt,
      },
      {
        role: "user",
        content: params.userMessage,
      },
    ] as OpenRouterChatMessage[],
    response_format: { type: "json_object" },
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseData = (await response.json()) as OpenRouterCompletionResponse;
  if (!response.ok) {
    throw new Error(
      responseData.error?.message ?? "OpenRouter request failed unexpectedly"
    );
  }

  const rawContent = responseData.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("OpenRouter returned an empty response payload");
  }

  // Some models wrap their JSON in markdown code fences (```json ... ```).
  // Strip them before parsing so we never fail on well-formed content.
  const jsonContent = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(jsonContent) as T;
  } catch (error) {
    throw new Error(
      `OpenRouter returned non-JSON content: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`
    );
  }
}
