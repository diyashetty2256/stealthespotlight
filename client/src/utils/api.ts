import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
