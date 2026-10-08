import { PrivyClient } from "@privy-io/server-auth";

let client: PrivyClient | null = null;
export function getPrivy() {
  if (!client) {
    client = new PrivyClient(process.env.NEXT_PUBLIC_PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  }
  return client;
}

export async function getUserId(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization");
  const token = h && h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const { userId } = await getPrivy().verifyAuthToken(token);
    return userId;
  } catch {
    return null;
  }
}
