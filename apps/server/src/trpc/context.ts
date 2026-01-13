import { auth, type Session } from "../auth";

export interface Context extends Record<string, unknown> {
  session: Session | null;
  user: Session["user"] | null;
}

export async function createContext(opts: { req: Request }): Promise<Context> {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return {
    session,
    user: session?.user ?? null,
  };
}
