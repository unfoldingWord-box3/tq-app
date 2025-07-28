/**
 * Offline Database Service for Bible Translation QA App
 * 
 * Manages SQLite storage for:
 * - Door43 Resource Containers
 * - User Projects and Sessions
 * - Sync Queue for offline-first functionality
 */

import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Door43Resource, ResourceManifest } from './door43ServiceDCS';

// Database configuration
const DB_NAME = 'qa_app.db';
const DB_VERSION = 1;

// Types for database records
export interface ResourceRecord {
  id: string;
  name: string;
  owner: string;
  repo: string;
  language: string;
  subject: string;
  format: 'usfm' | 'tsv' | 'md';
  type: 'bundle' | 'book' | 'help';
  version: string;
  local_path: string;
  manifest_data: string; // JSON string
  download_date: string;
  last_sync: string;
  is_downloaded: number; // SQLite boolean (0/1)
  file_size: number;
}

export interface ProjectRecord {
  id: string;
  book_code: string;
  scripture_resource_id: string;
  questions_resource_id: string;
  created_at: string;
  updated_at: string;
  created_date: string;
  last_sync: string;
  sync_status: 'local' | 'synced' | 'pending';
}

export interface SessionRecord {
  id: string;
  project_id: string;
  start_time: string;
  end_time?: string;
  current_reference: string;
  is_reviewed: number; // SQLite boolean (0/1)
  sync_status: 'local' | 'synced' | 'pending';
  session_data: string; // JSON string for bookmarks, etc.
  created_at: string;
  status: 'active' | 'completed' | 'paused';
}

export interface RecordingRecord {
  id: string;
  session_id: string;
  question_id: string;
  audio_file_path: string;
  timestamp: string;
  reference: string;
  duration?: number;
  sync_status: 'local' | 'synced' | 'pending';
}

export interface ReviewRecord {
  id: string;
  session_id: string;
  question_id: string;
  translation_understood: number; // SQLite boolean (0/1)
  notes?: string;
  reviewed_at: string;
  sync_status: 'local' | 'synced' | 'pending';
}

export interface SyncQueueRecord {
  id: string;
  type: 'recording' | 'review' | 'session' | 'project';
  data: string; // JSON string
  attempts: number;
  created_at: string;
  last_attempt?: string;
  error_message?: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Open database
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      
      // Enable foreign key constraints
      await this.db.execAsync('PRAGMA foreign_keys = ON;');
      
      // Create tables
      await this.createTables();
      
      // Run migrations for existing databases
      await this.runMigrations();
      
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Resources table
      `CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner TEXT NOT NULL,
        repo TEXT NOT NULL,
        language TEXT NOT NULL,
        subject TEXT NOT NULL,
        format TEXT NOT NULL CHECK (format IN ('usfm', 'tsv', 'md')),
        type TEXT NOT NULL CHECK (type IN ('bundle', 'book', 'help')),
        version TEXT NOT NULL,
        local_path TEXT,
        manifest_data TEXT,
        download_date TEXT,
        last_sync TEXT,
        is_downloaded INTEGER DEFAULT 0,
        file_size INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        book_code TEXT NOT NULL,
        scripture_resource_id TEXT NOT NULL,
        questions_resource_id TEXT NOT NULL,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        last_sync TEXT,
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'pending')),
        FOREIGN KEY (scripture_resource_id) REFERENCES resources (id),
        FOREIGN KEY (questions_resource_id) REFERENCES resources (id)
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        start_time TEXT DEFAULT CURRENT_TIMESTAMP,
        end_time TEXT,
        current_reference TEXT,
        is_reviewed INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'pending')),
        session_data TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )`,

      // Recordings table
      `CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        audio_file_path TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        reference TEXT NOT NULL,
        duration INTEGER,
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'pending')),
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )`,

      // Reviews table
      `CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        translation_understood INTEGER NOT NULL,
        notes TEXT,
        reviewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'pending')),
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )`,

      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('recording', 'review', 'session', 'project')),
        data TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_attempt TEXT,
        error_message TEXT
      )`,

      // App metadata table
      `CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_resources_language ON resources (language)',
      'CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources (subject)',
      'CREATE INDEX IF NOT EXISTS idx_resources_format ON resources (format)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON reviews (session_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue (type)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (attempts)'
    ];

    try {
      // Execute table creation
      for (const table of tables) {
        await this.db.execAsync(table);
      }

      // Create indexes
      for (const index of indexes) {
        await this.db.execAsync(index);
      }

      console.log('✅ Database tables created successfully');
    } catch (error) {
      console.error('❌ Error creating database tables:', error);
      throw error;
    }
  }

  /**
   * Run database migrations for existing databases
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check if status column exists in sessions table
      const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(sessions)`);
      const hasStatusColumn = tableInfo.some((column: any) => column.name === 'status');
      
      if (!hasStatusColumn) {
        console.log('🔄 Running migration: Adding status column to sessions table');
        await this.db.execAsync(`
          ALTER TABLE sessions 
          ADD COLUMN status TEXT DEFAULT 'active'
        `);
        console.log('✅ Migration completed: status column added');
      }

      // Check if created_at column exists in sessions table
      const hasCreatedAtColumn = tableInfo.some((column: any) => column.name === 'created_at');
      
      if (!hasCreatedAtColumn) {
        console.log('🔄 Running migration: Adding created_at column to sessions table');
        const currentTimestamp = new Date().toISOString();
        await this.db.execAsync(`
          ALTER TABLE sessions 
          ADD COLUMN created_at TEXT DEFAULT '${currentTimestamp}'
        `);
        console.log('✅ Migration completed: created_at column added');
      }

    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
  }

  // ===========================================
  // RESOURCE OPERATIONS
  // ===========================================

  /**
   * Save resource metadata to database (without download)
   */
  async saveResourceMetadata(resource: Door43Resource): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO resources 
         (id, name, owner, repo, language, subject, format, type, version, 
          local_path, manifest_data, download_date, last_sync, is_downloaded, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resource.id,
          resource.name,
          resource.owner,
          resource.repo,
          resource.language.identifier,
          resource.subject,
          resource.format,
          resource.type,
          resource.tag,
          null, // local_path - not downloaded yet
          null, // manifest_data - not available yet
          null, // download_date - not downloaded yet
          new Date().toISOString(),
          0, // is_downloaded = false
          0  // file_size = 0
        ]
      );

      console.log('✅ Resource metadata saved to database:', resource.name);
    } catch (error) {
      console.error('❌ Error saving resource metadata:', error);
      throw error;
    }
  }

  /**
   * Save downloaded resource to database
   */
  async saveResource(resource: Door43Resource, localPath: string, manifest?: ResourceManifest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

      await this.db.runAsync(
        `INSERT OR REPLACE INTO resources 
         (id, name, owner, repo, language, subject, format, type, version, 
          local_path, manifest_data, download_date, last_sync, is_downloaded, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resource.id,
          resource.name,
          resource.owner,
          resource.repo,
          resource.language.identifier,
          resource.subject,
          resource.format,
          resource.type,
          resource.tag,
          localPath,
          manifest ? JSON.stringify(manifest) : null,
          new Date().toISOString(),
          new Date().toISOString(),
          1, // is_downloaded = true
          fileSize
        ]
      );

      console.log('✅ Resource saved to database:', resource.name);
    } catch (error) {
      console.error('❌ Error saving resource:', error);
      throw error;
    }
  }

  /**
   * Get all downloaded resources
   */
  async getDownloadedResources(): Promise<ResourceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<ResourceRecord>(
        'SELECT * FROM resources WHERE is_downloaded = 1 ORDER BY download_date DESC'
      );
      return result;
    } catch (error) {
      console.error('❌ Error getting downloaded resources:', error);
      throw error;
    }
  }

  /**
   * Get resources by criteria
   */
  async getResourcesByType(subject: string, language: string = 'en'): Promise<ResourceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<ResourceRecord>(
        'SELECT * FROM resources WHERE subject = ? AND language = ? AND is_downloaded = 1',
        [subject, language]
      );
      return result;
    } catch (error) {
      console.error('❌ Error getting resources by type:', error);
      throw error;
    }
  }

  // ===========================================
  // PROJECT OPERATIONS
  // ===========================================

  /**
   * Create new project
   */
  async createProject(
    id: string,
    bookCode: string,
    scriptureResourceId: string,
    questionsResourceId: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `INSERT INTO projects (id, book_code, scripture_resource_id, questions_resource_id)
         VALUES (?, ?, ?, ?)`,
        [id, bookCode, scriptureResourceId, questionsResourceId]
      );

      console.log('✅ Project created:', id);
    } catch (error) {
      console.error('❌ Error creating project:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<ProjectRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<ProjectRecord>(
        'SELECT * FROM projects ORDER BY created_date DESC'
      );
      return result;
    } catch (error) {
      console.error('❌ Error getting projects:', error);
      throw error;
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(projectId: string): Promise<ProjectRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<ProjectRecord>(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );
      return result || null;
    } catch (error) {
      console.error('❌ Error getting project:', error);
      throw error;
    }
  }

  // ===========================================
  // SESSION OPERATIONS
  // ===========================================

  /**
   * Create new session
   */
  async createSession(id: string, projectId: string, currentReference: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT INTO sessions (id, project_id, current_reference) VALUES (?, ?, ?)',
        [id, projectId, currentReference]
      );

      console.log('✅ Session created:', id);
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get sessions for project
   */
  async getSessionsForProject(projectId: string): Promise<SessionRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<SessionRecord>(
        'SELECT * FROM sessions WHERE project_id = ? ORDER BY start_time DESC',
        [projectId]
      );
      return result;
    } catch (error) {
      console.error('❌ Error getting sessions:', error);
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId: string): Promise<{
    sessionCount: number;
    completedSessions: number;
    totalReviews: number;
    progress: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get session count
      const sessionCountResult = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sessions WHERE project_id = ?',
        [projectId]
      );
      const sessionCount = sessionCountResult?.count || 0;

      // Get completed sessions count
      const completedSessionsResult = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sessions WHERE project_id = ? AND status = ?',
        [projectId, 'completed']
      );
      const completedSessions = completedSessionsResult?.count || 0;

      // Get total reviews count
      const reviewsResult = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM reviews r 
         JOIN sessions s ON r.session_id = s.id 
         WHERE s.project_id = ?`,
        [projectId]
      );
      const totalReviews = reviewsResult?.count || 0;

      // Calculate progress (completed sessions / total sessions, or 0 if no sessions)
      const progress = sessionCount > 0 ? completedSessions / sessionCount : 0;

      return {
        sessionCount,
        completedSessions,
        totalReviews,
        progress
      };
    } catch (error) {
      console.error('❌ Error getting project statistics:', error);
      return {
        sessionCount: 0,
        completedSessions: 0,
        totalReviews: 0,
        progress: 0
      };
    }
  }

  /**
   * Get all project statistics for multiple projects
   */
  async getAllProjectStatistics(): Promise<Record<string, {
    sessionCount: number;
    completedSessions: number;
    totalReviews: number;
    progress: number;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const projects = await this.getProjects();
      const stats: Record<string, any> = {};

      for (const project of projects) {
        stats[project.id] = await this.getProjectStatistics(project.id);
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting all project statistics:', error);
      return {};
    }
  }

  // ===========================================
  // REVIEW OPERATIONS
  // ===========================================

  /**
   * Add review for a question
   */
  async addReview(
    id: string,
    sessionId: string,
    questionId: string,
    understanding: 'clear' | 'unclear',
    notes: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `INSERT INTO reviews (id, session_id, question_id, translation_understood, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [id, sessionId, questionId, understanding === 'clear' ? 1 : 0, notes]
      );

      console.log('✅ Review added:', id);
    } catch (error) {
      console.error('❌ Error adding review:', error);
      throw error;
    }
  }

  /**
   * Get all reviews for a session
   */
  async getReviewsForSession(sessionId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const reviews = await this.db.getAllAsync(
        `SELECT 
          id,
          session_id,
          question_id,
          translation_understood,
          notes,
          reviewed_at,
          CASE 
            WHEN translation_understood = 1 THEN 'clear'
            ELSE 'unclear'
          END as understanding
         FROM reviews 
         WHERE session_id = ?
         ORDER BY reviewed_at ASC`,
        [sessionId]
      );

      console.log(`📊 Found ${reviews.length} reviews for session:`, sessionId);
      return reviews;
    } catch (error) {
      console.error('❌ Error getting reviews for session:', error);
      throw error;
    }
  }

  // ===========================================
  // RECORDING OPERATIONS
  // ===========================================

  /**
   * Save a recording to the database
   */
  async saveRecording(
    id: string,
    sessionId: string,
    questionId: string,
    filePath: string,
    duration: number,
    reference: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO recordings 
         (id, session_id, question_id, audio_file_path, duration, reference)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, sessionId, questionId, filePath, duration, reference]
      );

      console.log('✅ Recording saved:', id);
    } catch (error) {
      console.error('❌ Error saving recording:', error);
      throw error;
    }
  }

  /**
   * Get recording for a specific question in a session
   */
  async getRecordingForQuestion(sessionId: string, questionId: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const recording = await this.db.getFirstAsync(
        `SELECT * FROM recordings 
         WHERE session_id = ? AND question_id = ?`,
        [sessionId, questionId]
      );

      return recording || null;
    } catch (error) {
      console.error('❌ Error getting recording:', error);
      throw error;
    }
  }

  /**
   * Get all recordings for a session
   */
  async getRecordingsForSession(sessionId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const recordings = await this.db.getAllAsync(
        `SELECT * FROM recordings 
         WHERE session_id = ?
         ORDER BY timestamp DESC`,
        [sessionId]
      );

      return recordings;
    } catch (error) {
      console.error('❌ Error getting session recordings:', error);
      throw error;
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `DELETE FROM recordings WHERE id = ?`,
        [recordingId]
      );

      console.log('✅ Recording deleted:', recordingId);
    } catch (error) {
      console.error('❌ Error deleting recording:', error);
      throw error;
    }
  }

  /**
   * Update recording metadata
   */
  async updateRecordingDuration(recordingId: string, duration: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `UPDATE recordings SET duration = ? WHERE id = ?`,
        [duration, recordingId]
      );

      console.log('✅ Recording duration updated:', recordingId, duration);
    } catch (error) {
      console.error('❌ Error updating recording duration:', error);
      throw error;
    }
  }

  // SESSION STATUS OPERATIONS
  // ===========================================

  /**
   * Update session status and optionally session data
   */
  async updateSessionStatus(sessionId: string, status: 'active' | 'paused' | 'completed', sessionData?: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const dataToStore = sessionData ? JSON.stringify(sessionData) : null;
      
      if (status === 'completed') {
        // Set end_time when session is completed
        await this.db.runAsync(
          `UPDATE sessions 
           SET status = ?, end_time = ?, session_data = ?
           WHERE id = ?`,
          [status, new Date().toISOString(), dataToStore, sessionId]
        );
      } else {
        // For active/paused, don't set end_time
        await this.db.runAsync(
          `UPDATE sessions 
           SET status = ?, session_data = ?
           WHERE id = ?`,
          [status, dataToStore, sessionId]
        );
      }
      
      console.log(`✅ Session ${sessionId} status updated to ${status}`);
    } catch (error) {
      console.error('❌ Error updating session status:', error);
      throw error;
    }
  }

  /**
   * Update session duration in session data
   */
  async updateSessionDuration(sessionId: string, totalDuration: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Get current session data
      const session = await this.db.getFirstAsync<SessionRecord>(
        'SELECT session_data FROM sessions WHERE id = ?',
        [sessionId]
      );
      
      let sessionData: any = {};
      if (session?.session_data) {
        try {
          sessionData = JSON.parse(session.session_data);
        } catch (e) {
          console.warn('Failed to parse session data, using empty object');
        }
      }
      
      // Update duration in session data
      sessionData.totalDuration = totalDuration;
      
      await this.db.runAsync(
        `UPDATE sessions 
         SET session_data = ?
         WHERE id = ?`,
        [JSON.stringify(sessionData), sessionId]
      );
      
      console.log(`✅ Session ${sessionId} duration updated to ${totalDuration}s`);
    } catch (error) {
      console.error('❌ Error updating session duration:', error);
      throw error;
    }
  }

  /**
   * Get parsed session data
   */
  async getSessionData(sessionId: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const session = await this.db.getFirstAsync<SessionRecord>(
        'SELECT session_data FROM sessions WHERE id = ?',
        [sessionId]
      );
      
      if (session?.session_data) {
        try {
          return JSON.parse(session.session_data);
        } catch (e) {
          console.warn('Failed to parse session data');
          return {};
        }
      }
      
      return {};
    } catch (error) {
      console.error('❌ Error getting session data:', error);
      return {};
    }
  }

  // ===========================================
  // DEVELOPER/DEBUG OPERATIONS
  // ===========================================

  /**
   * Delete all projects and related data
   */
  async deleteAllProjects(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Delete in order due to foreign key constraints
      await this.db.runAsync('DELETE FROM reviews');
      await this.db.runAsync('DELETE FROM recordings');
      await this.db.runAsync('DELETE FROM sessions');
      await this.db.runAsync('DELETE FROM projects');
      
      console.log('✅ All projects deleted');
    } catch (error) {
      console.error('❌ Error deleting all projects:', error);
      throw error;
    }
  }

  /**
   * Delete all sessions and related data
   */
  async deleteAllSessions(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM reviews');
      await this.db.runAsync('DELETE FROM recordings');
      await this.db.runAsync('DELETE FROM sessions');
      
      console.log('✅ All sessions deleted');
    } catch (error) {
      console.error('❌ Error deleting all sessions:', error);
      throw error;
    }
  }

  /**
   * Delete all cached resources
   */
  async deleteAllResources(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM resources');
      
      console.log('✅ All resources deleted from database');
    } catch (error) {
      console.error('❌ Error deleting all resources:', error);
      throw error;
    }
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM sync_queue');
      
      console.log('✅ Sync queue cleared');
    } catch (error) {
      console.error('❌ Error clearing sync queue:', error);
      throw error;
    }
  }

  /**
   * Get database statistics for debugging
   */
  async getDatabaseStats(): Promise<{
    projects: number;
    sessions: number;
    resources: number;
    reviews: number;
    recordings: number;
    syncQueue: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stats = await Promise.all([
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM projects'),
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions'),
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM resources'),
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM reviews'),
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM recordings'),
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue'),
      ]);

      return {
        projects: stats[0]?.count || 0,
        sessions: stats[1]?.count || 0,
        resources: stats[2]?.count || 0,
        reviews: stats[3]?.count || 0,
        recordings: stats[4]?.count || 0,
        syncQueue: stats[5]?.count || 0,
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return {
        projects: 0,
        sessions: 0,
        resources: 0,
        reviews: 0,
        recordings: 0,
        syncQueue: 0,
      };
    }
  }

  /**
   * Reset entire database (nuclear option)
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Delete all data in correct order
      await this.db.runAsync('DELETE FROM reviews');
      await this.db.runAsync('DELETE FROM recordings');
      await this.db.runAsync('DELETE FROM sessions');
      await this.db.runAsync('DELETE FROM projects');
      await this.db.runAsync('DELETE FROM resources');
      await this.db.runAsync('DELETE FROM sync_queue');
      
      console.log('🔥 Database reset - all data deleted');
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      throw error;
    }
  }

  // ===========================================
  // SYNC QUEUE OPERATIONS
  // ===========================================

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    id: string,
    type: 'recording' | 'review' | 'session' | 'project',
    data: any
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT INTO sync_queue (id, type, data) VALUES (?, ?, ?)',
        [id, type, JSON.stringify(data)]
      );

      console.log('✅ Added to sync queue:', type, id);
    } catch (error) {
      console.error('❌ Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get pending sync items
   */
  async getPendingSyncItems(): Promise<SyncQueueRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<SyncQueueRecord>(
        'SELECT * FROM sync_queue WHERE attempts < 3 ORDER BY created_at ASC'
      );
      return result;
    } catch (error) {
      console.error('❌ Error getting pending sync items:', error);
      throw error;
    }
  }

  /**
   * Update sync attempt
   */
  async updateSyncAttempt(id: string, success: boolean, errorMessage?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      if (success) {
        // Remove from queue if successful
        await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
      } else {
        // Increment attempts and update error
        await this.db.runAsync(
          `UPDATE sync_queue 
           SET attempts = attempts + 1, last_attempt = ?, error_message = ?
           WHERE id = ?`,
          [new Date().toISOString(), errorMessage || null, id]
        );
      }
    } catch (error) {
      console.error('❌ Error updating sync attempt:', error);
      throw error;
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get app metadata
   */
  async getMetadata(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_metadata WHERE key = ?',
        [key]
      );
      return result?.value || null;
    } catch (error) {
      console.error('❌ Error getting metadata:', error);
      return null;
    }
  }

  /**
   * Set app metadata
   */
  async setMetadata(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
        [key, value]
      );
    } catch (error) {
      console.error('❌ Error setting metadata:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get database size
   */
  async getDatabaseSize(): Promise<number> {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      return fileInfo.exists ? fileInfo.size || 0 : 0;
    } catch (error) {
      console.error('❌ Error getting database size:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

// Types are already exported individually above
