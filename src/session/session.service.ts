import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Session, IntentType, SessionContext } from '../appointment/appointment.types';

@Injectable()
export class SessionService implements OnModuleInit {
  private readonly logger = new Logger(SessionService.name);

  private sessions = new Map<string, Session>();

  private readonly STORE_FILE = path.join(
    process.cwd(),
    'data',
    'sessions.json',
  );

  // ─────────────────────────────────────────────
  // OnModuleInit: load sessions from file on startup
  // ─────────────────────────────────────────────
  onModuleInit() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (!fs.existsSync(this.STORE_FILE)) {
        this.logger.log('[Session] No existing session file — starting fresh');
        return;
      }
      const raw = fs.readFileSync(this.STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, Session>;
      this.sessions = new Map(Object.entries(parsed));
      this.logger.log(
        `[Session] Loaded ${this.sessions.size} session(s) from file`,
      );
    } catch (err) {
      this.logger.error(
        `[Session] Failed to load sessions — starting fresh. Error: ${(err as Error).message}`,
      );
      this.sessions = new Map();
    }
  }

  private persistToFile(): void {
    try {
      const dir = path.dirname(this.STORE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const plain = Object.fromEntries(this.sessions);
      fs.writeFileSync(
        this.STORE_FILE,
        JSON.stringify(plain, null, 2),
        'utf-8',
      );
      this.logger.log(
        `[Session] Persisted ${this.sessions.size} session(s) to file`,
      );
    } catch (err) {
      this.logger.error(
        `[Session] Failed to persist sessions: ${(err as Error).message}`,
      );
    }
  }

  // ─────────────────────────────────────────────
  // Get session for a user — creates one if not exists
  // ─────────────────────────────────────────────
  getSession(userPhone: string): Session {
    const existing = this.sessions.get(userPhone);
    if (existing) {
      this.logger.log(`[Session] Found existing session for ${userPhone}`);
      return existing;
    }

    const newSession: Session = {
      user_phone: userPhone,
      last_intent: IntentType.UNKNOWN,
      context: {},
      updated_at: new Date().toISOString(),
    };

    this.sessions.set(userPhone, newSession);
    this.persistToFile();
    this.logger.log(`[Session] Created new session for ${userPhone}`);
    return newSession;
  }

  // ─────────────────────────────────────────────
  // Update session with new intent and merged context
  // New context values override old ones
  // Undefined values in newContext do NOT wipe existing values
  // ─────────────────────────────────────────────
  updateSession(
    userPhone: string,
    intent: IntentType,
    newContext: SessionContext,
  ): Session {
    const session = this.getSession(userPhone);

    // Merge context — only override fields that are explicitly provided
    const mergedContext: SessionContext = {
      ...session.context,
      ...Object.fromEntries(
        Object.entries(newContext).filter(([, v]) => v !== undefined),
      ),
    };

    const updated: Session = {
      ...session,
      last_intent: intent,
      context: mergedContext,
      updated_at: new Date().toISOString(),
    };

    this.sessions.set(userPhone, updated);
    this.persistToFile();

    this.logger.log(
      `[Session] Updated session for ${userPhone} — intent: ${intent}`,
    );
    this.logger.log(
      `[Session] Context: ${JSON.stringify(mergedContext)}`,
    );

    return updated;
  }

  // ─────────────────────────────────────────────
  // Clear context when user changes topic
  // Keeps user_phone and last_intent, wipes context
  // ─────────────────────────────────────────────
  clearContext(userPhone: string): void {
    const session = this.getSession(userPhone);
    const cleared: Session = {
      ...session,
      context: {},
      updated_at: new Date().toISOString(),
    };
    this.sessions.set(userPhone, cleared);
    this.persistToFile();
    this.logger.log(`[Session] Context cleared for ${userPhone}`);
  }

  // ─────────────────────────────────────────────
  // Delete session entirely (for testing / cleanup)
  // ─────────────────────────────────────────────
  deleteSession(userPhone: string): void {
    this.sessions.delete(userPhone);
    this.persistToFile();
    this.logger.log(`[Session] Deleted session for ${userPhone}`);
  }
}