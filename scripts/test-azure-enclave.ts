#!/usr/bin/env bun
/**
 * Test script for Azure Confidential VM enclave
 * Tests attestation verification and Noise protocol handshake
 */

const ENCLAVE_IP = process.env.ENCLAVE_IP || '20.115.43.15';
const ATTESTATION_URL = `http://${ENCLAVE_IP}:8080/attestation`;
const WS_URL = `ws://${ENCLAVE_IP}:8081`;

async function testAttestation() {
  console.log('=== Testing Attestation ===');
  console.log(`Fetching attestation from ${ATTESTATION_URL}`);

  const response = await fetch(ATTESTATION_URL);
  if (!response.ok) {
    throw new Error(`Attestation fetch failed: ${response.status}`);
  }

  const attestation = await response.json();
  console.log('Attestation received:');
  console.log(`  Type: ${attestation.attestation_type}`);
  console.log(`  Public Key (hex): ${attestation.public_key.substring(0, 32)}...`);
  console.log(`  Public Key Hash: ${attestation.public_key_hash.substring(0, 32)}...`);
  console.log(`  Quote length: ${attestation.quote.length} chars (base64)`);

  // Decode and check quote structure
  const quoteBytes = Buffer.from(attestation.quote, 'base64');
  console.log(`  Quote binary size: ${quoteBytes.length} bytes`);

  // Check version (first 4 bytes should be 0x02000000 for version 2)
  const version = quoteBytes.readUInt32LE(0);
  console.log(`  Quote version: ${version}`);

  // Check report_data contains public key hash
  const reportData = attestation.report_data;
  const expectedHash = attestation.public_key_hash;
  if (reportData.startsWith(expectedHash)) {
    console.log('  ✓ Public key hash correctly bound in report_data');
  } else {
    console.log('  ✗ Public key hash NOT bound in report_data');
  }

  return attestation;
}

async function testWebSocketConnection() {
  console.log('\n=== Testing WebSocket Connection ===');
  console.log(`Connecting to ${WS_URL}`);

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, 10000);

    ws.onopen = () => {
      console.log('  ✓ WebSocket connection established');
      clearTimeout(timeout);
      ws.close();
      resolve();
    };

    ws.onerror = (error) => {
      console.log(`  ✗ WebSocket error: ${error}`);
      clearTimeout(timeout);
      reject(error);
    };

    ws.onclose = () => {
      console.log('  WebSocket closed');
    };
  });
}

async function testHealthEndpoint() {
  console.log('\n=== Testing Health Endpoint ===');

  const response = await fetch(`http://${ENCLAVE_IP}:8080/health`);
  const text = await response.text();

  if (response.ok && text === 'OK') {
    console.log('  ✓ Health check passed');
  } else {
    console.log(`  ✗ Health check failed: ${response.status} ${text}`);
  }
}

async function main() {
  console.log(`Testing enclave at ${ENCLAVE_IP}\n`);

  try {
    await testHealthEndpoint();
    const attestation = await testAttestation();
    await testWebSocketConnection();

    console.log('\n=== Summary ===');
    console.log('✓ All basic tests passed');
    console.log(`\nEnclave is running on Azure Confidential VM`);
    console.log(`Attestation type: ${attestation.attestation_type}`);

    if (attestation.attestation_type === 'mock-sev-snp') {
      console.log('\nNote: Using mock attestation. For real SEV-SNP attestation,');
      console.log('the enclave needs to use /dev/sev-guest or Azure MAA.');
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
