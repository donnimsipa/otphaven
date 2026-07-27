import { Peer, DataConnection } from 'peerjs';
import { DecryptedVault, SyncChange, ChangeID, AccountOperation, TOTPAccount } from '../types';

// Prefix to avoid collisions on public PeerJS server
const ID_PREFIX = 'otphaven-v1-';

// Reconnection settings
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Change tracking for conflict resolution
let localSequenceCounter = 0;
let localPeerId: string | null = null;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'reconnecting' | 'error';

export interface P2PMessage {
  type: 'SYNC_DATA' | 'ACK' | 'DELTA_UPDATE';
  payload?: DecryptedVault;
  delta?: SyncChange[];
  changeId?: ChangeID;
}

export class P2PService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onStatusChange: (status: ConnectionStatus, msg?: string) => void;
  private onDeltaReceive: (delta: SyncChange[]) => void;
  private onVaultReceive: (data: DecryptedVault) => void;
  private onInitialSyncRequest: () => void;
  
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pendingDeltas: SyncChange[] = [];
  private processedChangeIds: Set<string> = new Set();

  // Role and connection tracking
  private isHost: boolean = false;
  private remotePeerId: string | null = null;

  // Reliable Delivery state
  private pendingAcks: Map<string, {
    delta: SyncChange[];
    timestamp: number;
    attempts: number;
  }> = new Map();
  private ackCheckInterval: number | null = null;

  constructor(
    onStatusChange: (status: ConnectionStatus, msg?: string) => void,
    onDeltaReceive: (delta: SyncChange[]) => void,
    onVaultReceive: (data: DecryptedVault) => void,
    onInitialSyncRequest: () => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onDeltaReceive = onDeltaReceive;
    this.onVaultReceive = onVaultReceive;
    this.onInitialSyncRequest = onInitialSyncRequest;
  }

  private generateShortCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateChangeId(): ChangeID {
    return {
      peerId: localPeerId || 'unknown',
      timestamp: Date.now(),
      sequence: ++localSequenceCounter
    };
  }

  private getProcessedChangeId(changeId: ChangeID): string {
    return `${changeId.peerId}-${changeId.timestamp}-${changeId.sequence}`;
  }

  // Initialize as host - generates pairing code
  public initHost(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.remotePeerId = null;
      const code = this.generateShortCode();
      const peerId = `${ID_PREFIX}${code}`;
      localPeerId = peerId;

      this.onStatusChange('connecting', 'Initializing Room...');

      try {
        this.peer = new Peer(peerId);

        this.peer.on('open', (id) => {
          this.onStatusChange('disconnected', 'Waiting for peer...');
          resolve(code);
        });

        this.peer.on('connection', (conn) => {
          this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error("Peer Error", err);
          if (err.type === 'unavailable-id') {
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

  // Join as client
  public join(code: string) {
    this.isHost = false;
    this.remotePeerId = `${ID_PREFIX}${code}`;
    this.onStatusChange('connecting', `Joining Room ${code}...`);
    
    this.peer = new Peer(); 

    this.peer.on('open', (id) => {
      localPeerId = id;
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
      this.reconnectAttempts = 0;
      this.onStatusChange('connected', 'Connected');
      
      // Start reliability checks
      this.startAckCheckTimer();
      
      // Ask for current vault state
      this.conn!.send({ type: 'DELTA_UPDATE', delta: [] });

      // Flush offline updates
      this.flushPendingQueues();
    });

    conn.on('data', (data: any) => {
      const msg = data as P2PMessage;
      
      switch (msg.type) {
        case 'SYNC_DATA':
          // Full vault sync (initial sync)
          if (msg.payload) {
            this.onStatusChange('syncing', 'Merging vault data...');
            this.onVaultReceive(msg.payload);
            this.onStatusChange('connected', 'Sync complete');
          }
          break;
          
        case 'DELTA_UPDATE':
          // Incremental delta sync
          if (msg.delta) {
            if (msg.delta.length > 0) {
              // Immediately acknowledge each incoming delta
              msg.delta.forEach(delta => {
                this.sendAck(delta.changeId);
              });

              this.onStatusChange('syncing', 'Processing updates...');
              this.processIncomingDelta(msg.delta);
              this.onStatusChange('connected', 'Updates processed');
            } else {
              // Empty delta signifies sync request: send local vault
              this.onInitialSyncRequest();
            }
          }
          break;
          
        case 'ACK':
          // Acknowledgment received
          if (msg.changeId) {
            const changeIdStr = this.getProcessedChangeId(msg.changeId);
            this.pendingAcks.delete(changeIdStr);
          }
          break;
      }
    });

    conn.on('close', () => {
      this.stopAckCheckTimer();
      this.onStatusChange('disconnected', 'Peer disconnected');
      this.handleReconnection();
    });

    conn.on('error', (err) => {
      this.stopAckCheckTimer();
      this.onStatusChange('error', 'Connection error');
    });
  }

  private handleReconnection() {
    // Only client triggers reconnection; host remains in listener mode
    if (this.isHost) {
      console.log("Host connection closed. Waiting for peer...");
      this.onStatusChange('disconnected', 'Waiting for peer...');
      return;
    }

    if (!this.remotePeerId) {
      console.warn("No remote peer ID stored. Cannot reconnect.");
      this.onStatusChange('disconnected', 'Disconnected');
      return;
    }

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      // Exponential backoff
      const delay = Math.min(30000, RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1));
      this.onStatusChange('reconnecting', `Reconnecting... (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      this.reconnectTimer = setTimeout(() => {
        if (!this.peer || this.peer.destroyed) {
          this.peer = new Peer();
          this.peer.on('open', () => {
            if (this.remotePeerId) {
              const conn = this.peer!.connect(this.remotePeerId);
              this.handleConnection(conn);
            }
          });
          this.peer.on('error', (err) => {
            console.error("Reconnect Peer Error", err);
            this.handleReconnection();
          });
        } else {
          const conn = this.peer.connect(this.remotePeerId!);
          this.handleConnection(conn);
        }
      }, delay);
    } else {
      this.onStatusChange('disconnected', 'Connection lost');
    }
  }

  // Send full vault data
  public sendVault(vault: DecryptedVault) {
    if (this.conn && this.conn.open) {
      const msg: P2PMessage = { type: 'SYNC_DATA', payload: vault };
      this.conn.send(msg);
    } else {
      console.warn("Cannot send, connection not open");
    }
  }

  // Send delta update (incremental changes)
  public sendDeltaUpdate(deltas: SyncChange[]) {
    if (this.conn && this.conn.open) {
      // Track sent change IDs to avoid infinite loops and register in pendingAcks
      deltas.forEach(delta => {
        const changeIdStr = this.getProcessedChangeId(delta.changeId);
        this.processedChangeIds.add(changeIdStr);

        this.pendingAcks.set(changeIdStr, {
          delta: [delta],
          timestamp: Date.now(),
          attempts: 0
        });
      });
      
      const msg: P2PMessage = { type: 'DELTA_UPDATE', delta: deltas };
      this.conn.send(msg);
    } else {
      // Queue for later delivery
      this.pendingDeltas.push(...deltas);
    }
  }

  // Send ACK for a received change
  private sendAck(changeId: ChangeID) {
    if (this.conn && this.conn.open) {
      const msg: P2PMessage = { type: 'ACK', changeId };
      this.conn.send(msg);
    }
  }

  // Generate and send a delta update for a single account operation
  public sendAccountChange(operation: AccountOperation, account: TOTPAccount) {
    const changeId: ChangeID = this.generateChangeId();
    const delta: SyncChange = {
      changeId,
      operation,
      accountId: account.id,
      data: operation === 'delete' ? undefined : account
    };
    
    this.sendDeltaUpdate([delta]);
    return delta;
  }

  private processIncomingDelta(deltas: SyncChange[]) {
    const filteredDeltas = deltas.filter(delta => {
      const changeIdStr = this.getProcessedChangeId(delta.changeId);
      const isDuplicate = this.processedChangeIds.has(changeIdStr);
      if (!isDuplicate) {
        this.processedChangeIds.add(changeIdStr);
        // Clean up old processed IDs to prevent memory leaks
        if (this.processedChangeIds.size > 1000) {
          const keys = Array.from(this.processedChangeIds);
          this.processedChangeIds.clear();
          keys.slice(-500).forEach(k => this.processedChangeIds.add(k));
        }
      }
      return !isDuplicate;
    });

    if (filteredDeltas.length > 0) {
      this.onDeltaReceive(filteredDeltas);
    }
  }

  private startAckCheckTimer() {
    if (this.ackCheckInterval) return;
    this.ackCheckInterval = setInterval(() => {
      this.checkPendingAcks();
    }, 5000) as unknown as number;
  }

  private stopAckCheckTimer() {
    if (this.ackCheckInterval) {
      clearInterval(this.ackCheckInterval);
      this.ackCheckInterval = null;
    }
  }

  private checkPendingAcks() {
    if (!this.conn || !this.conn.open) return;

    const now = Date.now();
    const TIMEOUT_MS = 5000;
    const MAX_RETRIES = 3;

    this.pendingAcks.forEach((ackInfo, changeIdStr) => {
      if (now - ackInfo.timestamp > TIMEOUT_MS) {
        if (ackInfo.attempts < MAX_RETRIES) {
          ackInfo.attempts++;
          ackInfo.timestamp = now;
          console.log(`Retrying delta update ${changeIdStr} (attempt ${ackInfo.attempts})`);
          
          const msg: P2PMessage = { type: 'DELTA_UPDATE', delta: ackInfo.delta };
          this.conn!.send(msg);
        } else {
          console.warn(`Failed to deliver delta update ${changeIdStr} after ${MAX_RETRIES} attempts. Removing.`);
          this.pendingAcks.delete(changeIdStr);
        }
      }
    });
  }

  private flushPendingQueues() {
    if (!this.conn || !this.conn.open) return;

    const allDeltas: SyncChange[] = [];

    // Add unacknowledged updates back to the transfer list
    this.pendingAcks.forEach((ackInfo) => {
      allDeltas.push(...ackInfo.delta);
    });
    this.pendingAcks.clear();

    // Add offline updates
    if (this.pendingDeltas.length > 0) {
      allDeltas.push(...this.pendingDeltas);
      this.pendingDeltas = [];
    }

    if (allDeltas.length > 0) {
      console.log(`Flushing ${allDeltas.length} pending updates.`);
      this.sendDeltaUpdate(allDeltas);
    }
  }

  public destroy() {
    this.stopAckCheckTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
    this.peer = null;
    this.conn = null;
    this.reconnectAttempts = 0;
    this.processedChangeIds.clear();
    this.pendingDeltas = [];
    this.pendingAcks.clear();
  }
}
