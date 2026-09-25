import type { ReviewReport } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ReviewApiError extends Error {}

export async function reviewDiff(diffText: string): Promise<ReviewReport> {
  const response = await fetch(`${API_BASE_URL}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diff_text: diffText }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ReviewApiError(
      `Review request failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  return response.json() as Promise<ReviewReport>;
}
