import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { db, schema } from '../../db/client';

const { modelServers, serverModels } = schema;

export const modelServersRouter = router({
  list: protectedProcedure.query(async () => {
    const servers = await db
      .select()
      .from(modelServers)
      .where(eq(modelServers.status, 'ready'));

    const models = await db.select().from(serverModels);

    return servers.map((server) => ({
      ...server,
      models: models.filter((m) => m.serverId === server.id),
    }));
  }),

  listModels: protectedProcedure.query(async () => {
    const models = await db
      .select({
        id: serverModels.modelId,
        name: serverModels.modelName,
        displayName: serverModels.displayName,
        contextLength: serverModels.contextLength,
        serverId: serverModels.serverId,
        serverType: modelServers.serverType,
      })
      .from(serverModels)
      .innerJoin(modelServers, eq(serverModels.serverId, modelServers.id));

    return models.map((m) => ({
      ...m,
      provider: 'onera-private' as const,
    }));
  }),
});
