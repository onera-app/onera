#!/usr/bin/env bun
/**
 * Update enclave endpoints to use HTTPS via Caddy
 *
 * Run from apps/server: bun scripts/update-enclave-endpoints.ts
 */

import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client';

const { enclaves } = schema;

async function main() {
  console.log('Fetching current enclaves...\n');

  const currentEnclaves = await db.select().from(enclaves);

  if (currentEnclaves.length === 0) {
    console.log('No enclaves found in database');
    process.exit(0);
  }

  console.log('Current enclaves:');
  for (const enclave of currentEnclaves) {
    console.log(`  ID: ${enclave.id}`);
    console.log(`  Host: ${enclave.host}`);
    console.log(`  WS Endpoint: ${enclave.wsEndpoint}`);
    console.log(`  Attestation: ${enclave.attestationEndpoint}`);
    console.log('');
  }

  // Check for enclaves with HTTP endpoints that need updating
  const enclavesToUpdate = currentEnclaves.filter(e =>
    e.attestationEndpoint.startsWith('http://') ||
    e.wsEndpoint.startsWith('ws://')
  );

  if (enclavesToUpdate.length === 0) {
    console.log('All enclaves already using HTTPS/WSS endpoints');
    process.exit(0);
  }

  console.log(`Found ${enclavesToUpdate.length} enclave(s) to update to HTTPS...\n`);

  for (const enclave of enclavesToUpdate) {
    // Determine the new endpoints based on the host
    // Map 20.115.43.15 -> private.onera.chat
    const newHost = 'private.onera.chat';
    const newAttestationEndpoint = `https://${newHost}/attestation`;
    const newWsEndpoint = `wss://${newHost}/ws`;

    console.log(`Updating enclave ${enclave.id}:`);
    console.log(`  Old attestation: ${enclave.attestationEndpoint}`);
    console.log(`  New attestation: ${newAttestationEndpoint}`);
    console.log(`  Old WS: ${enclave.wsEndpoint}`);
    console.log(`  New WS: ${newWsEndpoint}`);

    await db.update(enclaves)
      .set({
        host: newHost,
        wsEndpoint: newWsEndpoint,
        attestationEndpoint: newAttestationEndpoint,
        updatedAt: new Date(),
      })
      .where(eq(enclaves.id, enclave.id));

    console.log(`  ✓ Updated\n`);
  }

  console.log('Done! Verifying...\n');

  const updatedEnclaves = await db.select().from(enclaves);
  for (const enclave of updatedEnclaves) {
    console.log(`  ${enclave.id}: ${enclave.attestationEndpoint}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
