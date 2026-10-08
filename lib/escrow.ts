import { PrivyClient } from "@privy-io/node";

let client: any = null;
export function getNodePrivy(): any {
  if (!client) {
    client = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });
  }
  return client;
}
