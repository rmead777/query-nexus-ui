
export interface ApiEndpoint {
  id: string;
  name: string;
  api_endpoint: string | null;
  api_key: string | null;
  model: string | null;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  request_template?: Record<string, any> | null;
}

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

export interface RequestTemplate {
  provider: string;
  name: string;
  template: Record<string, any>;
  description: string;
}

export const defaultRequestTemplates: RequestTemplate[] = [
  {
    provider: 'OpenAI',
    name: 'OpenAI Chat Completion',
    description: 'Standard format for OpenAI chat models (GPT-3.5, GPT-4)',
    template: {
      model: "{model}",
      messages: [
        { role: "system", content: "{instructions}" },
        { role: "user", content: "{prompt}" }
      ],
      temperature: 0.7,
      max_tokens: 2048
    }
  },
  {
    provider: 'Anthropic',
    name: 'Anthropic Claude',
    description: 'Format for Anthropic Claude models',
    template: {
      model: "{model}",
      messages: [
        { role: "system", content: "{instructions}" },
        { role: "user", content: "{prompt}" }
      ],
      temperature: 0.7,
      max_tokens: 2048
    }
  },
  {
    provider: 'Google',
    name: 'Google Gemini',
    description: 'Format for Google Gemini models',
    template: {
      model: "{model}",
      contents: [
        { role: "user", parts: [{ text: "{prompt}" }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95
      },
      systemInstruction: { parts: [{ text: "{instructions}" }] }
    }
  },
  {
    provider: 'Cohere',
    name: 'Cohere Chat',
    description: 'Format for Cohere chat models',
    template: {
      model: "{model}",
      message: "{prompt}",
      preamble: "{instructions}",
      temperature: 0.7,
      max_tokens: 2048
    }
  }
];
