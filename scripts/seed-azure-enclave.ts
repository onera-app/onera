#!/usr/bin/env bun
/**
 * Seed script for Azure Confidential VM enclave
 * Updates or creates enclave record pointing to Azure VM
 */

import { db } from '../apps/server/src/db/client';
import { enclaves, privateInferenceModels } from '../apps/server/src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const ENCLAVE_HOST = process.env.ENCLAVE_HOST || 'private.onera.chat';

async function seedAzureEnclave() {
  console.log('Seeding Azure Confidential VM enclave...');
  console.log(`Target host: ${ENCLAVE_HOST}`);

  // First, ensure the model exists
  const modelId = 'llama-3.1-8b-azure';
  await db
    .insert(privateInferenceModels)
    .values({
      id: modelId,
      name: 'meta-llama/Llama-3.1-8B-Instruct',
      displayName: 'Llama 3.1 8B (Azure TEE)',
      contextLength: 128000,
      weightsPath: '/models/llama-3.1-8b',
      minGpuMemoryGb: 16,
      recommendedGpuMemoryGb: 24,
      expectedLaunchDigest: null, // No verification in Phase 1
      enabled: true,
    })
    .onConflictDoNothing();

  // Check for existing Azure enclave
  const existing = await db
    .select()
    .from(enclaves)
    .where(eq(enclaves.host, ENCLAVE_HOST))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    console.log('Updating existing enclave record...');
    await db
      .update(enclaves)
      .set({
        status: 'ready',
        wsEndpoint: `wss://${ENCLAVE_HOST}/ws`,
        attestationEndpoint: `https://${ENCLAVE_HOST}/attestation`,
        currentConnections: 0, // Reset connections on update
        updatedAt: new Date(),
      })
      .where(eq(enclaves.id, existing[0].id));
    console.log(`Updated enclave: ${existing[0].id}`);
  } else {
    // Create new
    const enclaveId = randomUUID();
    await db.insert(enclaves).values({
      id: enclaveId,
      modelId: modelId,
      tier: 'shared',
      status: 'ready',
      host: ENCLAVE_HOST,
      port: 443, // HTTPS port
      wsEndpoint: `wss://${ENCLAVE_HOST}/ws`,
      attestationEndpoint: `https://${ENCLAVE_HOST}/attestation`,
      publicKey: null,
      launchDigest: null,
      currentConnections: 0,
      maxConnections: 10,
    });
    console.log(`Created enclave: ${enclaveId}`);
  }

  console.log('\nAzure enclave seeded successfully!');
  console.log(`  Model: ${modelId}`);
  console.log(`  Attestation: https://${ENCLAVE_HOST}/attestation`);
  console.log(`  WebSocket: wss://${ENCLAVE_HOST}/ws`);
}

seedAzureEnclave()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
