import type { ProjectType } from "../schemas/index.js";

export type StackAlias = "ai-basic";

export type StackRecommendationInput = ProjectType | StackAlias;

export type RecommendedStackService = {
  serviceId: string;
  role: "llm" | "database" | "storage" | "hosting" | "deployment";
  required: boolean;
};

export type RecommendedStack = {
  id: string;
  projectType: ProjectType;
  title: string;
  services: RecommendedStackService[];
};

const stacks: Record<ProjectType, RecommendedStack> = {
  ai_saas: {
    id: "ai-saas-basic",
    projectType: "ai_saas",
    title: "AI SaaS basic free stack",
    services: [
      { serviceId: "groq", role: "llm", required: true },
      { serviceId: "supabase", role: "database", required: true },
      { serviceId: "vercel", role: "hosting", required: false }
    ]
  },
  rag: {
    id: "rag-basic",
    projectType: "rag",
    title: "RAG basic free stack",
    services: [
      { serviceId: "gemini", role: "llm", required: true },
      { serviceId: "supabase", role: "database", required: true },
      { serviceId: "cloudflare-r2", role: "storage", required: false }
    ]
  },
  blog: {
    id: "blog-basic",
    projectType: "blog",
    title: "Blog basic free stack",
    services: [
      { serviceId: "vercel", role: "hosting", required: true },
      { serviceId: "supabase", role: "database", required: false },
      { serviceId: "cloudflare-r2", role: "storage", required: false }
    ]
  },
  agent_tool: {
    id: "agent-tool-basic",
    projectType: "agent_tool",
    title: "Agent tool basic free stack",
    services: [
      { serviceId: "groq", role: "llm", required: true },
      { serviceId: "openrouter", role: "llm", required: false },
      { serviceId: "vercel", role: "deployment", required: false }
    ]
  },
  mobile_app: {
    id: "mobile-app-basic",
    projectType: "mobile_app",
    title: "Mobile app basic free stack",
    services: [
      { serviceId: "supabase", role: "database", required: true },
      { serviceId: "gemini", role: "llm", required: false },
      { serviceId: "vercel", role: "deployment", required: false }
    ]
  },
  custom: {
    id: "custom-basic",
    projectType: "custom",
    title: "Custom basic free stack",
    services: [
      { serviceId: "groq", role: "llm", required: false },
      { serviceId: "supabase", role: "database", required: false },
      { serviceId: "vercel", role: "hosting", required: false }
    ]
  }
};

export function recommendStack(input: StackRecommendationInput): RecommendedStack {
  if (input === "ai-basic") {
    return cloneStack(stacks.ai_saas);
  }

  return cloneStack(stacks[input]);
}

function cloneStack(stack: RecommendedStack): RecommendedStack {
  return {
    ...stack,
    services: stack.services.map((service) => ({ ...service }))
  };
}
