/**
 * Noise WebSocket Session Manager
 *
 * Provides a high-level interface for encrypted WebSocket communication
 * using the Noise Protocol NK handshake pattern.
 *
 * The session establishes an encrypted channel to a TEE endpoint using
 * the server's public key obtained from attestation verification.
 */

import type { NoiseSession } from '@onera/types';
import {
  performNKHandshake,
  encryptMessage,
  decryptMessage,
  type HandshakeResult,
} from './handshake';
import { secureZero } from '../sodium/utils';

/**
 * WebSocket session with Noise Protocol encryption.
 * Implements the NoiseSession interface for TEE communication.
 */
export class NoiseWebSocketSession implements NoiseSession {
  private ciphers: HandshakeResult | null = null;
  private ws: WebSocket | null = null;
  private messageQueue: Uint8Array[] = [];
  private messageResolvers: ((data: Uint8Array) => void)[] = [];
  private _closed = false;

  private constructor() {}

  /**
   * Check if the session is closed.
   */
  get isClosed(): boolean {
    return this._closed;
  }

  /**
   * Establish an encrypted WebSocket session to a TEE endpoint.
   *
   * @param endpoint - WebSocket URL (wss://...)
   * @param serverPublicKey - Base64-encoded X25519 public key from attestation
   * @returns Connected and encrypted session
   * @throws If connection or handshake fails
   */
  static async connect(
    endpoint: string,
    serverPublicKey: string
  ): Promise<NoiseWebSocketSession> {
    const session = new NoiseWebSocketSession();

    // Establish WebSocket connection
    session.ws = new WebSocket(endpoint);
    session.ws.binaryType = 'arraybuffer';

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 30000);

      session.ws!.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      session.ws!.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });

    // Set up message handling
    session.ws.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      const resolver = session.messageResolvers.shift();
      if (resolver) {
        resolver(data);
      } else {
        session.messageQueue.push(data);
      }
    };

    session.ws.onclose = () => {
      session._closed = true;
      // Reject any pending resolvers
      while (session.messageResolvers.length > 0) {
        const resolver = session.messageResolvers.shift();
        // Resolve with empty array to signal close
        resolver?.(new Uint8Array(0));
      }
    };

    session.ws.onerror = () => {
      session._closed = true;
    };

    // Perform Noise NK handshake
    session.ciphers = await performNKHandshake(
      serverPublicKey,
      async (message) => {
        if (!session.ws || session.ws.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket not connected');
        }
        session.ws.send(message);
      },
      async () => {
        if (session.messageQueue.length > 0) {
          return session.messageQueue.shift()!;
        }
        return new Promise<Uint8Array>((resolve, reject) => {
          if (session._closed) {
            reject(new Error('Session closed during handshake'));
            return;
          }
          session.messageResolvers.push(resolve);
        });
      }
    );

    return session;
  }

  /**
   * Encrypt plaintext for sending to the TEE.
   *
   * @param plaintext - Data to encrypt
   * @returns Encrypted ciphertext with authentication tag
   * @throws If session is not established or closed
   */
  encrypt(plaintext: Uint8Array): Uint8Array {
    if (!this.ciphers) {
      throw new Error('Session not established');
    }
    if (this._closed) {
      throw new Error('Session closed');
    }
    return encryptMessage(this.ciphers.sendCipher, plaintext);
  }

  /**
   * Decrypt ciphertext received from the TEE.
   *
   * @param ciphertext - Encrypted data with authentication tag
   * @returns Decrypted plaintext
   * @throws If session is not established, closed, or authentication fails
   */
  decrypt(ciphertext: Uint8Array): Uint8Array {
    if (!this.ciphers) {
      throw new Error('Session not established');
    }
    if (this._closed) {
      throw new Error('Session closed');
    }
    return decryptMessage(this.ciphers.recvCipher, ciphertext);
  }

  /**
   * Send an encrypted message and wait for a single response.
   *
   * IMPORTANT: This method is not safe for concurrent calls.
   * Use separate session instances for concurrent requests.
   *
   * @param plaintext - Data to send
   * @returns Decrypted response
   * @throws If session is closed or communication fails
   */
  async sendAndReceive(plaintext: Uint8Array): Promise<Uint8Array> {
    if (!this.ws || this._closed) {
      throw new Error('Session closed');
    }

    const encrypted = this.encrypt(plaintext);
    this.ws.send(encrypted);

    const response = await new Promise<Uint8Array>((resolve, reject) => {
      if (this.messageQueue.length > 0) {
        resolve(this.messageQueue.shift()!);
        return;
      }
      if (this._closed) {
        reject(new Error('Session closed'));
        return;
      }
      this.messageResolvers.push(resolve);
    });

    if (response.length === 0) {
      throw new Error('Connection closed by server');
    }

    return this.decrypt(response);
  }

  /**
   * Send an encrypted message and stream responses.
   * Yields decrypted response chunks until the stream ends.
   *
   * @param plaintext - Data to send
   * @yields Decrypted response chunks
   */
  async *sendAndStream(plaintext: Uint8Array): AsyncIterable<Uint8Array> {
    if (!this.ws || this._closed) {
      throw new Error('Session closed');
    }

    const encrypted = this.encrypt(plaintext);
    this.ws.send(encrypted);

    while (!this._closed) {
      const response = await new Promise<Uint8Array | null>((resolve) => {
        if (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()!;
          // Empty message signals end of stream
          if (msg.length === 0) {
            resolve(null);
          } else {
            resolve(msg);
          }
          return;
        }
        if (this._closed) {
          resolve(null);
          return;
        }
        this.messageResolvers.push((data) => {
          if (data.length === 0) {
            resolve(null);
          } else {
            resolve(data);
          }
        });
      });

      if (response === null) break;
      yield this.decrypt(response);
    }
  }

  /**
   * Close the session and clean up resources.
   * After closing, the session cannot be reused.
   */
  close(): void {
    this._closed = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    // Securely clear cipher states
    if (this.ciphers) {
      secureZero(this.ciphers.sendCipher.key);
      secureZero(this.ciphers.recvCipher.key);
      this.ciphers = null;
    }
    // Clear queues
    this.messageQueue = [];
    this.messageResolvers = [];
  }
}
