declare module '@onera/crypto/noise' {
  export class NoiseWebSocketSession {
    static connect(url: string, serverPublicKeyHex: string): Promise<NoiseWebSocketSession>;
    sendAndReceive(message: Uint8Array): Promise<Uint8Array>;
    sendAndStream(message: Uint8Array): AsyncIterable<Uint8Array>;
    close(): void;
  }
}
