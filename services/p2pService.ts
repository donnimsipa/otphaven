import { Peer, DataConnection } from 'peerjs';
import { DecryptedVault } from '../types';

// Prefix to avoid collisions on public PeerJS server
const ID_PREFIX = 'otphaven-v1-';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface P2PMessage {
  type: 'SYNC_DATA' | 'ACK';
  payload?: DecryptedVault;
}

export class P2PService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onStatusChange: (status: ConnectionStatus, msg?: string) => void;
  private onDataReceive: (data: DecryptedVault) => void;

  constructor(
    onStatusChange: (status: ConnectionStatus, msg?: string) => void,
    onDataReceive: (data: DecryptedVault) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onDataReceive = onDataReceive;
  }

  // Generate a random 4-digit code
  private generateShortCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public initHost(): Promise<string> {
    return new Promise((resolve, reject) => {
      const code = this.generateShortCode();
      const peerId = `${ID_PREFIX}${code}`;

      this.onStatusChange('connecting', 'Initializing Room...');

      try {
        this.peer = new Peer(peerId);

        this.peer.on('open', (id) => {
          this.onStatusChange('disconnected', 'Waiting for peer...'); // Disconnected from peer, but ready
          resolve(code);
        });

        this.peer.on('connection', (conn) => {
          this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error("Peer Error", err);
          if (err.type === 'unavailable-id') {
             // Retry with new code if collision
             this.peer?.destroy();
             this.initHost().then(resolve).catch(reject);
          } else {
             this.onStatusChange('error', 'Connection failed');
             reject(err);
          }
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  public join(code: string) {
    this.onStatusChange('connecting', `Joining Room ${code}...`);
    
    // We don't need a specific ID to join, allow random
    this.peer = new Peer(); 

    this.peer.on('open', () => {
      const destId = `${ID_PREFIX}${code}`;
      const conn = this.peer!.connect(destId);
      this.handleConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error(err);
      this.onStatusChange('error', 'Could not connect to room');
    });
  }

  private handleConnection(conn: DataConnection) {
    this.conn = conn;

    conn.on('open', () => {
      this.onStatusChange('connected');
    });

    conn.on('data', (data: any) => {
      const msg = data as P2PMessage;
      if (msg.type === 'SYNC_DATA' && msg.payload) {
        this.onDataReceive(msg.payload);
      }
    });

    conn.on('close', () => {
      this.onStatusChange('disconnected', 'Peer disconnected');
      this.conn = null;
    });

    conn.on('error', (err) => {
      this.onStatusChange('error', 'Connection error');
    });
  }

  public sendVault(vault: DecryptedVault) {
    if (this.conn && this.conn.open) {
      const msg: P2PMessage = { type: 'SYNC_DATA', payload: vault };
      this.conn.send(msg);
    } else {
      console.warn("Cannot send, connection not open");
    }
  }

  public destroy() {
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
    this.peer = null;
    this.conn = null;
  }
}