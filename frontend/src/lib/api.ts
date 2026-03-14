const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined in Vercel environment variables");
}

const API_URL = `${BASE_URL}/api`;

export interface TechNode {
  name: string;
  cpe: string;
}

export interface UserResponse {
  id: number;
  username: string;
  tech_stack: TechNode[];
}

export interface MatchedTech {
  name: string;
  match_type: "Precise (CPE)" | "Semantic (Keyword)";
}

export interface PersonalizedThreatResponse {
  cve_id: string;
  severity: string;
  ai_summary: string;
  relevance_score: number;
  matched_tech: MatchedTech[];
  published_date: string;
  is_actively_exploited: boolean;
  is_patched: boolean;
  epss_score: number;
}

export interface NewsItem {
  title: string;
  link: string;
  description?: string;
  pub_date?: string;
  source?: string;
  matched_tech: string[];
}

export interface PersonalizedDashboardResponse {
  threats: PersonalizedThreatResponse[];
  news: NewsItem[];
  is_protected?: boolean;
}

export async function getUser(userId: number): Promise<UserResponse | null> {
  try {
    const res = await fetch(`${API_URL}/users/${userId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch user");
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function createUser(username: string, tech_stack: TechNode[]): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, tech_stack }),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

export async function updateUserStack(userId: number, techStack: TechNode[]): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/users/${userId}/stack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(techStack),
  });
  if (!res.ok) throw new Error("Failed to update user stack");
  return res.json();
}

export async function scanTechStackFile(userId: number, file: File): Promise<UserResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/users/${userId}/scan`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to scan user stack file");
  return res.json();
}

export async function getPersonalizedThreats(userId: number = 1): Promise<PersonalizedDashboardResponse> {
  try {
    const defaultUserId = userId || 1;
    const res = await fetch(`${API_URL}/threats/personalized/${defaultUserId}`);
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error (${res.status}): ${errorText}`);
      throw new Error(`Failed to fetch personalized threats. Context: ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    console.error("DEBUG FETCH ERROR in getPersonalizedThreats:", error);
    throw error;
  }
}

export async function scanSandboxThreats(tags: string[]): Promise<PersonalizedDashboardResponse> {
  const res = await fetch(`${API_URL}/threats/sandbox`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error("Failed to scan sandbox threats");
  return res.json();
}

export async function resetUserStack(userId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/users/${userId}/reset`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to reset core stack");
  return res.json();
}