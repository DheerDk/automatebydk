import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessage,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { SocketServer } from '../sockets/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/prisma.js';
import { WebhookController } from '../controllers/webhook.controller.js';

interface SessionState {
  sock: any;
  qr: string | null;
  qrDataUrl: string | null;
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  phone?: string;
}

export class BaileysService {
  private static sessions: Map<string, SessionState> = new Map();
  private static sessionsBaseDir = path.resolve(process.cwd(), '.sessions');

  /**
   * Ensure sessions directory exists
   */
  private static ensureSessionDir(orgId: string): string {
    const dir = path.join(this.sessionsBaseDir, orgId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Get current session status for an organization
   */
  public static getSessionStatus(organizationId: string) {
    const session = this.sessions.get(organizationId);
    if (!session) {
      return {
        status: 'DISCONNECTED',
        qr: null,
        qrDataUrl: null,
        phone: null,
      };
    }
    return {
      status: session.status,
      qr: session.qr,
      qrDataUrl: session.qrDataUrl,
      phone: session.phone || null,
    };
  }

  /**
   * Initialize or resume Baileys connection for an organization
   */
  public static async initSession(organizationId: string) {
    // If already connected, return current state
    const existing = this.sessions.get(organizationId);
    if (existing && existing.status === 'CONNECTED' && existing.sock) {
      return this.getSessionStatus(organizationId);
    }

    // Set initial state
    const sessionDir = this.ensureSessionDir(organizationId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const pinoLogger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      logger: pinoLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
      },
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

    const sessionState: SessionState = {
      sock,
      qr: null,
      qrDataUrl: null,
      status: 'CONNECTING',
    };
    this.sessions.set(organizationId, sessionState);

    // Save auth credentials whenever updated
    sock.ev.on('creds.update', saveCreds);

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        sessionState.qr = qr;
        try {
          sessionState.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        } catch {
          sessionState.qrDataUrl = null;
        }
        sessionState.status = 'QR_READY';

        logger.info(`[Baileys] QR code ready for org: ${organizationId}`);
        SocketServer.emitToOrg(organizationId, 'whatsapp:qr', {
          qr: sessionState.qr,
          qrDataUrl: sessionState.qrDataUrl,
          status: 'QR_READY',
        });
      }

      if (connection === 'open') {
        const rawId = sock.user?.id || '';
        const phone = rawId.split(':')[0] || rawId.split('@')[0];
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        sessionState.status = 'CONNECTED';
        sessionState.qr = null;
        sessionState.qrDataUrl = null;
        sessionState.phone = formattedPhone;

        logger.info(`[Baileys] WhatsApp connected successfully for org ${organizationId} (Phone: ${formattedPhone})`);

        // Update database WhatsAppAccount status
        await prisma.whatsAppAccount.upsert({
          where: { organizationId },
          create: {
            organizationId,
            phoneNumberId: 'baileys_linked',
            businessAccountId: 'baileys_linked',
            accessToken: 'baileys_linked_session',
            verifyToken: 'baileys_linked_session',
            displayPhoneNumber: formattedPhone,
            status: 'CONNECTED',
          },
          update: {
            displayPhoneNumber: formattedPhone,
            status: 'CONNECTED',
          },
        });

        SocketServer.emitToOrg(organizationId, 'whatsapp:status', {
          status: 'CONNECTED',
          phone: formattedPhone,
          name: sock.user?.name || formattedPhone,
        });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.warn(`[Baileys] Connection closed for org ${organizationId}. Status: ${statusCode}, ShouldReconnect: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          sessionState.status = 'DISCONNECTED';
          sessionState.qr = null;
          sessionState.qrDataUrl = null;
          sessionState.phone = undefined;

          // Clear local credentials on logout
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }

          await prisma.whatsAppAccount.updateMany({
            where: { organizationId },
            data: { status: 'DISCONNECTED' },
          });

          SocketServer.emitToOrg(organizationId, 'whatsapp:status', {
            status: 'DISCONNECTED',
            phone: null,
          });
        } else if (shouldReconnect) {
          sessionState.status = 'CONNECTING';
          setTimeout(() => {
            BaileysService.initSession(organizationId);
          }, 3000);
        }
      }
    });

    // Inbound Messages Listener
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          await BaileysService.handleIncomingBaileysMessage(organizationId, msg);
        } catch (err) {
          logger.error('[Baileys] Error processing inbound message:', err);
        }
      }
    });

    return this.getSessionStatus(organizationId);
  }

  private static jidMap: Map<string, string> = new Map();

  /**
   * Process incoming message from Baileys socket
   */
  private static async handleIncomingBaileysMessage(organizationId: string, msg: WAMessage) {
    // Ignore messages sent by ourselves
    if (msg.key.fromMe) return;

    // Ignore broadcast and group messages for now
    const remoteJid = msg.key.remoteJid || '';
    if (!remoteJid || remoteJid.endsWith('@broadcast') || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
      return;
    }

    // Clean sender phone representation
    const rawNumber = remoteJid.split('@')[0];
    const senderPhone = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`;
    const contactName = msg.pushName || `Customer ${senderPhone}`;
    const whatsappMessageId = msg.key.id || `baileys_${Date.now()}`;

    // Save JID mapping so outbound messages always reply to the exact same JID (handles both @s.whatsapp.net and @lid)
    this.jidMap.set(senderPhone, remoteJid);
    this.jidMap.set(rawNumber, remoteJid);
    this.jidMap.set(rawNumber.replace(/\D/g, ''), remoteJid);

    // Extract text content
    let text = '';
    const m = msg.message;
    if (m?.conversation) {
      text = m.conversation;
    } else if (m?.extendedTextMessage?.text) {
      text = m.extendedTextMessage.text;
    } else if (m?.buttonsResponseMessage?.selectedDisplayText) {
      text = m.buttonsResponseMessage.selectedDisplayText;
    } else if (m?.listResponseMessage?.title) {
      text = m.listResponseMessage.title;
    } else if (m?.templateButtonReplyMessage?.selectedDisplayText) {
      text = m.templateButtonReplyMessage.selectedDisplayText;
    }

    if (!text || text.trim().length === 0) return;

    logger.info(`[Baileys Inbound] Received from ${senderPhone} (${contactName}) [JID: ${remoteJid}]: "${text}"`);

    // Fetch organization settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });

    // Process via unified AI & Automation pipeline
    await WebhookController.processInboundMessage({
      organizationId,
      phone: senderPhone,
      name: contactName,
      text: text.trim(),
      whatsappMessageId,
      settings: org?.settings,
    });
  }

  /**
   * Send outbound message via active Baileys session
   */
  public static async sendMessage(params: {
    organizationId: string;
    to: string;
    content: string;
    mediaUrl?: string;
  }): Promise<{ whatsappMessageId: string; success: boolean }> {
    const { organizationId, to, content, mediaUrl } = params;
    const session = this.sessions.get(organizationId);

    if (!session || session.status !== 'CONNECTED' || !session.sock) {
      throw new Error(`WhatsApp QR session is not connected for organization ${organizationId}`);
    }

    const cleanTo = to.replace(/\D/g, '');
    
    // Resolve proper JID (prioritizing mapped JID if incoming was via @lid)
    let jid = this.jidMap.get(to) || this.jidMap.get(cleanTo);
    if (!jid) {
      if (to.includes('@')) {
        jid = to;
      } else {
        jid = `${cleanTo}@s.whatsapp.net`;
      }
    }

    logger.info(`[Baileys Outbound] Sending to ${jid}: "${content.substring(0, 60)}..."`);

    let sentMsg: any;

    if (mediaUrl) {
      try {
        sentMsg = await session.sock.sendMessage(jid, {
          image: { url: mediaUrl },
          caption: content,
        });
      } catch (mediaErr: any) {
        logger.warn(`[Baileys] Media send failed (${mediaErr.message}), falling back to text message.`);
        sentMsg = await session.sock.sendMessage(jid, {
          text: `${content}\n\n📷 Image: ${mediaUrl}`,
        });
      }
    } else {
      sentMsg = await session.sock.sendMessage(jid, {
        text: content,
      });
    }

    const whatsappMessageId = sentMsg?.key?.id || `baileys_out_${Date.now()}`;
    return { whatsappMessageId, success: true };
  }

  /**
   * Disconnect and logout session
   */
  public static async logout(organizationId: string) {
    const session = this.sessions.get(organizationId);
    if (session?.sock) {
      try {
        await session.sock.logout();
      } catch (err) {
        logger.warn(`Error logging out Baileys socket for org ${organizationId}:`, err);
      }
    }

    const sessionDir = path.join(this.sessionsBaseDir, organizationId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    this.sessions.delete(organizationId);

    await prisma.whatsAppAccount.updateMany({
      where: { organizationId },
      data: { status: 'DISCONNECTED' },
    });

    SocketServer.emitToOrg(organizationId, 'whatsapp:status', {
      status: 'DISCONNECTED',
      phone: null,
    });

    return { success: true };
  }

  /**
   * Check if organization currently has an active connected Baileys session
   */
  public static isConnected(organizationId: string): boolean {
    const session = this.sessions.get(organizationId);
    if (session?.status === 'CONNECTED' && !!session.sock) {
      return true;
    }
    const sessionDir = path.join(this.sessionsBaseDir, organizationId);
    if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
      return true;
    }
    return false;
  }

  /**
   * Auto-resume all saved Baileys sessions on server boot
   */
  public static async initAllSavedSessions() {
    if (!fs.existsSync(this.sessionsBaseDir)) return;
    try {
      const orgDirs = fs.readdirSync(this.sessionsBaseDir);
      for (const orgId of orgDirs) {
        const credsPath = path.join(this.sessionsBaseDir, orgId, 'creds.json');
        if (fs.existsSync(credsPath)) {
          logger.info(`[Baileys] 🔄 Auto-resuming WhatsApp QR session for organization: ${orgId}`);
          await this.initSession(orgId);
        }
      }
    } catch (err) {
      logger.error('[Baileys] Error during auto-resuming sessions:', err);
    }
  }
}
