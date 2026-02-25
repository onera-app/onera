import { Hono } from "hono";
import { z } from "zod";
import { randomUUID } from "crypto";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import WebSocket from "ws";
import { NoiseWebSocketSession } from "@onera/crypto/noise";
import { db, schema } from "../db/client";
import { authenticateApiRequest } from "../auth/apiTokens";
import { checkInferenceAllowance } from "../billing/usage";

const { enclaves, enclaveAssignments, serverModels, modelServers } = schema;

const MODEL_LIST_SCHEMA = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    contextLength: z.number().nullable().optional(),
  })
);

const completionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      })
    ),
  ]),
});

const chatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z.array(completionMessageSchema).min(1),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
});

interface AttestationResponse {
  public_key: string;
}

const publicKeyCache = new Map<string, { key: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchEnclavePublicKey(enclaveId: string, attestationEndpoint: string): Promise<string> {
  const cached = publicKeyCache.get(enclaveId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.key;
  }

  const response = await fetch(attestationEndpoint, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Attestation endpoint returned ${response.status}`);
  }

  const attestation = (await response.json()) as AttestationResponse;
  const keyBytes = Buffer.from(attestation.public_key, "base64");

  if (keyBytes.length !== 32) {
    throw new Error(`Invalid public key length: ${keyBytes.length}`);
  }

  const hexKey = keyBytes.toString("hex");
  publicKeyCache.set(enclaveId, { key: hexKey, fetchedAt: Date.now() });
  return hexKey;
}

async function allocateSharedEnclave(userId: string): Promise<{ assignmentId: string; enclave: typeof enclaves.$inferSelect }> {
  const assignmentId = randomUUID();
  const sessionId = randomUUID();

  const enclave = await db.transaction(async (tx) => {
    const [updatedEnclave] = await tx
      .update(enclaves)
      .set({
        currentConnections: sql`${enclaves.currentConnections} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(enclaves.tier, "shared"),
          eq(enclaves.status, "ready"),
          lt(enclaves.currentConnections, enclaves.maxConnections)
        )
      )
      .returning();

    if (!updatedEnclave) {
      throw new Error("No available shared enclaves");
    }

    await tx.insert(enclaveAssignments).values({
      id: assignmentId,
      enclaveId: updatedEnclave.id,
      userId,
      sessionId,
    });

    return updatedEnclave;
  });

  return { assignmentId, enclave };
}

async function releaseAssignment(assignmentId: string): Promise<void> {
  const [assignment] = await db
    .select()
    .from(enclaveAssignments)
    .where(and(eq(enclaveAssignments.id, assignmentId), isNull(enclaveAssignments.releasedAt)))
    .limit(1);

  if (!assignment) {
    return;
  }

  await db
    .update(enclaveAssignments)
    .set({ releasedAt: new Date() })
    .where(eq(enclaveAssignments.id, assignmentId));

  await db
    .update(enclaves)
    .set({
      currentConnections: sql`GREATEST(${enclaves.currentConnections} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(enclaves.id, assignment.enclaveId));
}

function normalizeMessages(messages: z.infer<typeof completionMessageSchema>[]): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return messages.map((message) => {
    if (typeof message.content === "string") {
      return { role: message.role, content: message.content };
    }

    const content = message.content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");

    return { role: message.role, content };
  });
}

async function listPrivateModels() {
  // First try: get models from server_models table
  const dbModels = await db
    .select({
      id: serverModels.modelId,
      name: serverModels.modelName,
      displayName: serverModels.displayName,
      contextLength: serverModels.contextLength,
    })
    .from(serverModels)
    .innerJoin(modelServers, and(eq(serverModels.serverId, modelServers.id), eq(modelServers.status, "ready")));

  if (dbModels.length > 0) {
    return MODEL_LIST_SCHEMA.parse(dbModels);
  }

  // Fallback: query ready enclaves directly for their models
  const readyEnclaves = await db
    .select()
    .from(enclaves)
    .where(eq(enclaves.status, "ready"));

  if (readyEnclaves.length === 0) {
    return [];
  }

  const allModels: z.infer<typeof MODEL_LIST_SCHEMA> = [];

  for (const enclave of readyEnclaves) {
    try {
      const baseUrl = enclave.attestationEndpoint.replace("/attestation", "");
      const response = await fetch(`${baseUrl}/models`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const models = (await response.json()) as Array<{
          id: string;
          name: string;
          displayName: string;
          contextLength?: number;
        }>;
        for (const m of models) {
          allModels.push({
            id: m.id,
            name: m.name,
            displayName: m.displayName,
            contextLength: m.contextLength ?? null,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch models from enclave ${enclave.id}:`, error);
    }
  }

  return allModels;
}

export const privateInferenceApi = new Hono<{ Variables: { userId: string } }>();

privateInferenceApi.use("*", async (c, next) => {
  const userId = await authenticateApiRequest(c.req.raw.headers);

  if (!userId) {
    return c.json(
      {
        error: {
          message: "Unauthorized",
          type: "authentication_error",
        },
      },
      401
    );
  }

  c.set("userId", userId);
  await next();
});

privateInferenceApi.get("/models", async (c) => {
  const models = await listPrivateModels();

  return c.json({
    object: "list",
    data: models.map((model) => ({
      id: model.id,
      object: "model",
      created: 0,
      owned_by: "onera-private",
    })),
  });
});

privateInferenceApi.post("/chat/completions", async (c) => {
  const userId = c.get("userId");

  const body = await c.req.json();
  const parsed = chatCompletionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          message: "Invalid request body",
          type: "invalid_request_error",
          details: parsed.error.flatten(),
        },
      },
      400
    );
  }

  const input = parsed.data;

  const allowance = await checkInferenceAllowance(userId, "private");
  if (!allowance.allowed) {
    return c.json(
      {
        error: {
          message: "Inference limit reached for current plan",
          type: "insufficient_quota",
        },
      },
      402
    );
  }

  let assignmentId: string | null = null;

  try {
    const allocation = await allocateSharedEnclave(userId);
    assignmentId = allocation.assignmentId;

    const publicKey = await fetchEnclavePublicKey(
      allocation.enclave.id,
      allocation.enclave.attestationEndpoint
    );

    const session = await NoiseWebSocketSession.connect(
      allocation.enclave.wsEndpoint,
      publicKey,
      { WebSocket: WebSocket as unknown as typeof globalThis.WebSocket }
    );

    try {
      const requestPayload = {
        model: input.model,
        messages: normalizeMessages(input.messages),
        stream: !!input.stream,
        temperature: input.temperature,
        max_tokens: input.max_tokens ?? input.max_completion_tokens,
      };

      if (input.stream) {
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const completionId = `chatcmpl_${randomUUID()}`;
            const created = Math.floor(Date.now() / 1000);

            const sendChunk = (payload: unknown) => {
              const line = `data: ${JSON.stringify(payload)}\n\n`;
              controller.enqueue(encoder.encode(line));
            };

            try {
              const requestBytes = new TextEncoder().encode(JSON.stringify(requestPayload));

              for await (const chunk of session.sendAndStream(requestBytes)) {
                const decoded = JSON.parse(new TextDecoder().decode(chunk));

                if (decoded.type === "text-delta") {
                  sendChunk({
                    id: completionId,
                    object: "chat.completion.chunk",
                    created,
                    model: input.model,
                    choices: [
                      {
                        index: 0,
                        delta: {
                          content: decoded.text || "",
                        },
                        finish_reason: null,
                      },
                    ],
                  });
                } else if (decoded.type === "finish") {
                  sendChunk({
                    id: completionId,
                    object: "chat.completion.chunk",
                    created,
                    model: input.model,
                    choices: [
                      {
                        index: 0,
                        delta: {},
                        finish_reason: decoded.finishReason || "stop",
                      },
                    ],
                  });
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                } else if (decoded.content !== undefined) {
                  if (decoded.content) {
                    sendChunk({
                      id: completionId,
                      object: "chat.completion.chunk",
                      created,
                      model: input.model,
                      choices: [
                        {
                          index: 0,
                          delta: {
                            content: decoded.content,
                          },
                          finish_reason: null,
                        },
                      ],
                    });
                  }
                  sendChunk({
                    id: completionId,
                    object: "chat.completion.chunk",
                    created,
                    model: input.model,
                    choices: [
                      {
                        index: 0,
                        delta: {},
                        finish_reason: decoded.finish_reason || "stop",
                      },
                    ],
                  });
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
              }

              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (error) {
              console.error("Private inference streaming error:", error);
              const errorLine = `data: ${JSON.stringify({
                error: {
                  message: "Streaming request failed",
                  type: "server_error",
                },
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(errorLine));
              controller.close();
            }
          },
        });

        return c.newResponse(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }

      const requestBytes = new TextEncoder().encode(JSON.stringify(requestPayload));
      const responseBytes = await session.sendAndReceive(requestBytes);
      const response = JSON.parse(new TextDecoder().decode(responseBytes));

      return c.json({
        id: response.id || `chatcmpl_${randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: input.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: response.content || "",
            },
            finish_reason: response.finishReason || "stop",
          },
        ],
        usage: {
          prompt_tokens: response.usage?.promptTokens || 0,
          completion_tokens: response.usage?.completionTokens || 0,
          total_tokens:
            (response.usage?.promptTokens || 0) +
            (response.usage?.completionTokens || 0),
        },
      });
    } finally {
      session.close();
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Private inference API error:", errMsg, error);
    return c.json(
      {
        error: {
          message: process.env.NODE_ENV === "production"
            ? "Private inference request failed"
            : `Private inference request failed: ${errMsg}`,
          type: "server_error",
        },
      },
      500
    );
  } finally {
    if (assignmentId) {
      await releaseAssignment(assignmentId);
    }
  }
});
