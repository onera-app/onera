export interface TransparencyLogEntry {
  version: string;
  measurements: {
    launch_digest: string;
  };
  buildManifestHash: string;
  timestamp: number;
  logIndex: number;
  inclusionProof?: string;
}

export interface TransparencyLogVerification {
  verified: boolean;
  entry?: TransparencyLogEntry;
  error?: string;
}

const REKOR_URL = 'https://rekor.sigstore.dev';

/**
 * Query Rekor for an entry matching the given launch digest.
 */
export async function queryTransparencyLog(
  launchDigest: string
): Promise<TransparencyLogVerification> {
  try {
    // Search Rekor by SHA256 hash of launch digest
    const searchResponse = await fetch(`${REKOR_URL}/api/v1/index/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hash: `sha256:${launchDigest}`,
      }),
    });

    if (!searchResponse.ok) {
      if (searchResponse.status === 404) {
        return {
          verified: false,
          error: 'No transparency log entry found for this launch digest',
        };
      }
      return {
        verified: false,
        error: `Rekor search failed: ${searchResponse.status}`,
      };
    }

    const logIndexes: string[] = await searchResponse.json();
    if (logIndexes.length === 0) {
      return {
        verified: false,
        error: 'No matching entries in transparency log',
      };
    }

    // Fetch the most recent matching entry
    const entryUuid = logIndexes[logIndexes.length - 1];
    const entryResponse = await fetch(
      `${REKOR_URL}/api/v1/log/entries/${entryUuid}`
    );

    if (!entryResponse.ok) {
      return {
        verified: false,
        error: `Failed to fetch log entry: ${entryResponse.status}`,
      };
    }

    const entryData = await entryResponse.json();
    const entry = Object.values(entryData)[0] as any;

    return {
      verified: true,
      entry: {
        version: entry.body?.spec?.content?.version || 'unknown',
        measurements: { launch_digest: launchDigest },
        buildManifestHash: entry.body?.spec?.content?.hash || '',
        timestamp: entry.integratedTime * 1000,
        logIndex: entry.logIndex,
        inclusionProof: JSON.stringify(entry.verification?.inclusionProof),
      },
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Transparency log query failed',
    };
  }
}

/**
 * Publish a new entry to Rekor (server-side only).
 * Called during build/release pipeline.
 */
export async function publishToTransparencyLog(
  launchDigest: string,
  buildManifest: string,
  _version: string,
  signingKey: string
): Promise<{ logIndex: number; uuid: string } | null> {
  try {
    const response = await fetch(`${REKOR_URL}/api/v1/log/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiVersion: '0.0.1',
        kind: 'hashedrekord',
        spec: {
          data: {
            hash: {
              algorithm: 'sha256',
              value: launchDigest,
            },
          },
          signature: {
            content: btoa(signingKey),
            publicKey: {
              content: btoa(buildManifest),
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to publish to Rekor:', response.status);
      return null;
    }

    const data = await response.json();
    const entry = Object.values(data)[0] as any;
    return {
      logIndex: entry.logIndex,
      uuid: Object.keys(data)[0],
    };
  } catch (error) {
    console.error('Transparency log publish error:', error);
    return null;
  }
}
