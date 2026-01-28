import { db } from './client';
import { enclaves, privateInferenceModels } from './schema';
import { randomUUID } from 'crypto';

async function seedTeeData() {
  console.log('Seeding TEE development data...');

  // Add development model
  const modelId = 'llama-3.1-8b-dev';
  await db
    .insert(privateInferenceModels)
    .values({
      id: modelId,
      name: 'meta-llama/Llama-3.1-8B-Instruct',
      displayName: 'Llama 3.1 8B (Private)',
      contextLength: 128000,
      weightsPath: '/models/llama-3.1-8b',
      minGpuMemoryGb: 16,
      recommendedGpuMemoryGb: 24,
      expectedLaunchDigest: null, // No verification in dev
      enabled: true,
    })
    .onConflictDoNothing();

  // Add development enclave (points to local Docker)
  const enclaveId = randomUUID();
  await db
    .insert(enclaves)
    .values({
      id: enclaveId,
      modelId: modelId,
      tier: 'shared',
      status: 'ready',
      host: 'localhost',
      port: 8081,
      wsEndpoint: 'ws://localhost:8081',
      attestationEndpoint: 'http://localhost:8080/attestation',
      publicKey: null, // Will be populated by enclave at startup
      launchDigest: null,
      currentConnections: 0,
      maxConnections: 10,
    })
    .onConflictDoNothing();

  console.log('TEE development data seeded:');
  console.log(`  Model: ${modelId}`);
  console.log(`  Enclave: ${enclaveId}`);
}

seedTeeData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
