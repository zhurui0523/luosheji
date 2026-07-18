import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import { createRequire } from 'module';

let customRequire: any;
try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    customRequire = createRequire(import.meta.url);
  } else {
    customRequire = typeof require !== 'undefined' ? require : undefined;
  }
} catch (e) {
  customRequire = typeof require !== 'undefined' ? require : undefined;
}

const getFilename = () => {
  try {
    if (typeof __filename !== 'undefined' && __filename) return __filename;
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string') return fileURLToPath(import.meta.url);
  } catch (e) {}
  return path.join(process.cwd(), 'server.ts');
};

const __filename_path = getFilename();
const __dirname = path.dirname(__filename_path);
const __filename = __filename_path;

// Explicitly load .env from the root directory
const rootPath = path.resolve(process.cwd(), '.env');
console.log('🔍 Current Working Directory:', process.cwd());

function loadEnv(envPath: string) {
  if (fs.existsSync(envPath)) {
    try {
      fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `Loading env from: ${envPath}\n`);
      // 1. Try standard dotenv with override
      dotenv.config({ path: envPath, override: true });
      
      // 2. Manual parsing fallback (if dotenv fails for some reason)
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          // Remove quotes and trailing carriage returns
          value = value.replace(/(^['"]|['"]$)/g, '').trim();
          if (key) {
            // FORCE override existing process.env values
            process.env[key] = value;
            if (key.startsWith('DB_') || key.startsWith('OSS_')) {
               fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `Set ${key}=${key.includes('PASSWORD') || key.includes('SECRET') ? '********' : value}\n`);
            }
          }
        }
      });
      console.log('✅ Environment variables FORCED from:', envPath);
      return true;
    } catch (e: any) {
      fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `Error reading .env file: ${e.message}\n`);
      console.error('❌ Error reading .env file:', e);
    }
  }
  return false;
}

if (!loadEnv(rootPath)) {
  fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `Root .env NOT found at: ${rootPath}\n`);
  console.warn('⚠️ .env file NOT found at root, trying fallback...');
  const fallbackPath = path.resolve(__dirname, '../.env');
  loadEnv(fallbackPath);
}

fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `DB_HOST from process.env: ${process.env.DB_HOST || '(EMPTY)'}\n`);

// Helper to parse database configuration from a host string or full URL
const parseDbConfig = (dbHostRaw: string, defaultPort = 3306, defaultUser = '', defaultPassword = '', defaultDatabase = 'luosheji') => {
  // If it's a full URL, we can try to parse it
  if (dbHostRaw.startsWith('mysql://')) {
    try {
      const url = new URL(dbHostRaw);
      return {
        host: url.hostname,
        port: parseInt(url.port || String(defaultPort)),
        user: url.username || defaultUser,
        password: decodeURIComponent(url.password) || defaultPassword,
        database: url.pathname.substring(1) || defaultDatabase,
      };
    } catch (e) {
      console.warn('Failed to parse DB_HOST as URL, falling back to manual parsing');
    }
  }

  return {
    host: dbHostRaw.replace(/^mysql:\/\//, '').split('@').pop()?.split(':')[0] || '',
    port: defaultPort,
    user: defaultUser,
    password: defaultPassword,
    database: defaultDatabase,
  };
};

// MySQL Configuration Getter - Ensures we always get the latest env vars
const getMysqlConfig = () => {
  const dbHostRaw = process.env.DB_HOST || '';
  return parseDbConfig(
    dbHostRaw,
    parseInt(process.env.DB_PORT || '3306'),
    process.env.DB_USER || '',
    process.env.DB_PASSWORD || '',
    process.env.DB_NAME || 'luosheji'
  );
};

const isTruthyEnv = (value?: string) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
const isFalsyEnv = (value?: string) => ['0', 'false', 'no', 'off'].includes(String(value || '').toLowerCase());

export const requiresCloudStorage = () => {
  const explicit = process.env.REQUIRE_CLOUD_STORAGE || process.env.XIAOLUO_REQUIRE_CLOUD_STORAGE;
  if (isTruthyEnv(explicit)) return true;
  if (isFalsyEnv(explicit)) return false;
  return true;
};

export const allowsLocalDatabaseFallback = () => {
  const explicit = process.env.ALLOW_LOCAL_DATABASE_FALLBACK || process.env.XIAOLUO_ALLOW_LOCAL_DATABASE_FALLBACK;
  if (isTruthyEnv(explicit)) return true;
  if (isFalsyEnv(explicit)) return false;
  return !requiresCloudStorage();
};

let lastConnectionError: any = null;
export const getLastError = () => lastConnectionError;

// Database Wrapper to handle MySQL and SQLite fallback
class DatabaseWrapper {
  private mysqlPool: mysql.Pool | null = null;
  private sqliteDb: any = null;
  private mode: 'mysql' | 'sqlite' | 'offline' = 'mysql';

  private ensurePool() {
    if (this.mysqlPool || this.sqliteDb) return;

    const config = getMysqlConfig();
    
    if (!config.host || !config.user) {
      if (!allowsLocalDatabaseFallback()) {
        const error = new Error('MySQL configuration is required for cloud persistence. Set DB_HOST, DB_USER, DB_PASSWORD and DB_NAME, or explicitly enable ALLOW_LOCAL_DATABASE_FALLBACK for local development.');
        lastConnectionError = error;
        throw error;
      }
      console.warn('⚠️ MySQL configuration is missing. Falling back to SQLite.');
      this.initSqlite();
      return;
    }

    try {
      this.mysqlPool = mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        maxIdle: 10,
        idleTimeout: 30000, // Reduced to 30s to recycle idle connections more frequently
        connectTimeout: 30000
      });
      this.mode = 'mysql';
    } catch (e) {
      if (!allowsLocalDatabaseFallback()) {
        lastConnectionError = e;
        throw e;
      }
      console.error('Failed to create MySQL pool, falling back to SQLite:', e);
      this.initSqlite();
    }
  }

  private initSqlite() {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    try {
      const sqlite3 = customRequire('better-sqlite3');
      this.sqliteDb = new sqlite3(dbPath);
      this.sqliteDb.pragma('foreign_keys = ON');
      this.mode = 'sqlite';
      console.log('✅ SQLite database initialized at:', dbPath);
    } catch (err: any) {
      console.error('❌ Failed to load better-sqlite3:', err);
      lastConnectionError = err;
      this.sqliteDb = null;
      this.mode = 'offline';
      console.warn('Database is running in offline file-backed mode. Configure MySQL or rebuild better-sqlite3 for full database persistence.');
    }
  }

  setMode(mode: 'mysql' | 'sqlite' | 'offline') {
    this.mode = mode;
    if (mode === 'sqlite' && !this.sqliteDb) {
      this.initSqlite();
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    this.ensurePool();

    if (this.mode === 'offline') {
      return mockOfflineQueryResult(sql);
    }

    if (this.mode === 'sqlite' && this.sqliteDb) {
      // Convert MySQL syntax to SQLite if necessary
      let sqliteSql = sql
        .replace(/AUTO_INCREMENT/gi, '') // SQLite uses AUTOINCREMENT on INTEGER PRIMARY KEY
        .replace(/LONGTEXT/gi, 'TEXT')
        .replace(/JSON/gi, 'TEXT')
        .replace(/`key`/gi, 'key')
        .replace(/`value`/gi, 'value')
        .replace(/`updated_at`/gi, 'updated_at');

      // Handle ON DUPLICATE KEY UPDATE -> ON CONFLICT(...) DO UPDATE SET
      if (sqliteSql.toUpperCase().includes('ON DUPLICATE KEY UPDATE')) {
        // Find the table name to determine the primary key
        const tableNameMatch = sqliteSql.match(/INSERT\s+INTO\s+(\w+)/i);
        const tableName = tableNameMatch ? tableNameMatch[1].toLowerCase() : '';
        
        let conflictKey = 'id';
        if (tableName === 'settings') {
          conflictKey = 'key';
        }
        
        sqliteSql = sqliteSql.replace(/ON DUPLICATE KEY UPDATE/gi, `ON CONFLICT(${conflictKey}) DO UPDATE SET`);
        sqliteSql = sqliteSql.replace(/VALUES\(([^)]+)\)/gi, 'excluded.$1');
      }

      // Handle MySQL specific queries
      if (sqliteSql.toUpperCase().startsWith('SHOW COLUMNS')) {
        const tableName = sqliteSql.match(/FROM\s+(\w+)/i)?.[1];
        const columnName = sqliteSql.match(/LIKE\s+'([^']+)'/i)?.[1];
        if (tableName) {
          const info = this.sqliteDb.prepare(`PRAGMA table_info(${tableName})`).all();
          if (columnName) {
            return [info.filter((c: any) => c.name === columnName)];
          }
          return [info];
        }
      }

      try {
        const stmt = this.sqliteDb.prepare(sqliteSql);
        if (sqliteSql.trim().toUpperCase().startsWith('SELECT') || sqliteSql.trim().toUpperCase().startsWith('PRAGMA') || sqliteSql.trim().toUpperCase().startsWith('SHOW')) {
          const rows = stmt.all(...params);
          return [rows];
        } else {
          const result = stmt.run(...params);
          return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
        }
      } catch (e) {
        console.error('SQLite Query Error:', e, 'SQL:', sqliteSql);
        throw e;
      }
    }

    if (!this.mysqlPool) {
      if (!allowsLocalDatabaseFallback()) {
        throw new Error('MySQL connection is unavailable while cloud persistence is required.');
      }
      this.mode = 'offline';
      return mockOfflineQueryResult(sql);
    }

    let retries = 3;
    while (retries > 0) {
      try {
        return await this.mysqlPool.query(sql, params);
      } catch (error: any) {
        const isConnectionError = error.code === 'PROTOCOL_CONNECTION_LOST' || 
                                 error.code === 'ECONNRESET' || 
                                 error.code === 'ETIMEDOUT' ||
                                 error.message?.includes('Connection lost') ||
                                 error.message?.includes('server closed the connection') ||
                                 error.message?.includes('timeout reading communication packets') ||
                                 error.message?.includes('ETIMEDOUT');
        
        if (isConnectionError && retries > 1) {
          console.warn(`MySQL Connection lost, retrying (${retries - 1} left)...`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw error;
      }
    }
  }

  async getConnection(): Promise<any> {
    this.ensurePool();
    if (this.mode === 'mysql' && this.mysqlPool) {
      return await this.mysqlPool.getConnection();
    }
    
    // For SQLite, we return a mock connection object that implements query
    return {
      query: (sql: string, params: any[] = []) => this.query(sql, params),
      release: () => {},
      beginTransaction: async () => {
        if (this.sqliteDb) this.sqliteDb.prepare('BEGIN').run();
      },
      commit: async () => {
        if (this.sqliteDb) this.sqliteDb.prepare('COMMIT').run();
      },
      rollback: async () => {
        if (this.sqliteDb) this.sqliteDb.prepare('ROLLBACK').run();
      },
      ping: async () => {}
    };
  }

  getMode() {
    return this.mode;
  }

  async reset() {
    if (this.mysqlPool) {
      await this.mysqlPool.end().catch(() => {});
      this.mysqlPool = null;
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
    this.mode = 'mysql'; // Reset to default mode
  }
}

function mockOfflineQueryResult(sql: string): any {
  const normalized = String(sql || '').trim().toUpperCase();
  if (
    normalized.startsWith('SELECT') ||
    normalized.startsWith('SHOW') ||
    normalized.startsWith('PRAGMA')
  ) {
    return [[]];
  }
  return [{ insertId: 0, affectedRows: 0 }];
}

const dbWrapper = new DatabaseWrapper();

export const initDb = async () => {
  await dbWrapper.reset();
  const config = getMysqlConfig();
  const dbName = config.database;

  try {
    // Test MySQL connection
    let tempConnection;
    try {
      if (!config.host || !config.user) {
        dbWrapper.setMode('sqlite');
        return;
      }

      tempConnection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: dbName,
        connectTimeout: 10000 // Shorter timeout for initial check
      });
      fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `Successfully connected to MySQL database: ${dbName}\n`);
      console.log(`Successfully connected to MySQL database: ${dbName}`);
      dbWrapper.setMode('mysql');
      await tempConnection.end();
    } catch (dbError: any) {
      console.error('MySQL Initial Connection Error:', {
        code: dbError.code,
        errno: dbError.errno,
        sqlState: dbError.sqlState,
        message: dbError.message,
        host: config.host,
        port: config.port,
        user: config.user
      });
      if (dbError.code === 'ER_BAD_DB_ERROR') {
        tempConnection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          connectTimeout: 10000
        });
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await tempConnection.query(`USE \`${dbName}\``);
        console.log(`Successfully created and connected to MySQL database: ${dbName}`);
        dbWrapper.setMode('mysql');
        await tempConnection.end();
      } else {
        throw dbError;
      }
    }
  } catch (error: any) {
    lastConnectionError = error;
    fs.appendFileSync(path.join(process.cwd(), 'startup_debug.log'), `MySQL Connection failed: ${error.code} - ${error.message}\n`);
    console.error('\n' + '!'.repeat(60));
    console.error('MYSQL CONNECTION FAILED - FALLING BACK TO SQLITE');
    console.error('!'.repeat(60));
    console.error(`Error Code: ${error.code || 'UNKNOWN'}`);
    console.error(`Message: ${error.message}`);
    
    dbWrapper.setMode('sqlite');
    
    // Write error to a file for debugging
    try {
      fs.writeFileSync(path.join(process.cwd(), 'db_connection_error.log'), JSON.stringify({
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
        host: config.host,
        user: config.user,
        database: config.database,
        fallback: 'sqlite'
      }, null, 2));
    } catch (fsError) {
      console.error('Failed to write error log:', fsError);
    }
  }

  const connection = await dbWrapper.getConnection();

  try {
    const isSqlite = dbWrapper.getMode() === 'sqlite';
    const autoInc = isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT';
    const intPk = isSqlite ? 'INTEGER PRIMARY KEY' : 'INT PRIMARY KEY AUTO_INCREMENT';

    // Users table
    await connection.query(`CREATE TABLE IF NOT EXISTS users (
      \`id\` ${intPk},
      \`username\` VARCHAR(255) UNIQUE,
      \`password\` VARCHAR(255),
      \`phone\` VARCHAR(20),
      \`points\` INT DEFAULT 10,
      \`role\` VARCHAR(20) DEFAULT 'user',
      \`status\` VARCHAR(20) DEFAULT 'active',
      \`leader_id\` INT DEFAULT NULL,
      \`point_limit\` INT DEFAULT 0,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`leader_id\`) REFERENCES users(\`id\`) ON DELETE SET NULL
    )`);

    // Group Chats tables
    await connection.query(`CREATE TABLE IF NOT EXISTS group_chats (
      \`id\` ${intPk},
      \`name\` VARCHAR(255) NOT NULL,
      \`leader_id\` INT NOT NULL,
      \`objective\` TEXT,
      \`agent_ids\` TEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`leader_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    await connection.query(`CREATE TABLE IF NOT EXISTS group_chat_members (
      \`id\` ${intPk},
      \`group_id\` INT NOT NULL,
      \`user_id\` INT NOT NULL,
      \`joined_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      ${isSqlite ? 'UNIQUE(group_id, user_id)' : 'UNIQUE KEY group_user (group_id, user_id)'},
      FOREIGN KEY(\`group_id\`) REFERENCES group_chats(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    await connection.query(`CREATE TABLE IF NOT EXISTS group_messages (
      \`id\` ${intPk},
      \`group_id\` INT NOT NULL,
      \`sender_id\` INT,
      \`agent_name\` VARCHAR(255),
      \`content\` TEXT NOT NULL,
      \`type\` VARCHAR(20) DEFAULT 'text',
      \`url\` TEXT,
      \`quoted_message_id\` INT,
      \`timestamp\` BIGINT NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`group_id\`) REFERENCES group_chats(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY(\`sender_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    // Migration for group_messages url, quoted_message_id and agent_name
    if (!isSqlite) {
      try {
        const [urlCols]: any = await connection.query(`SHOW COLUMNS FROM group_messages LIKE 'url'`);
        if (urlCols.length === 0) {
          await connection.query(`ALTER TABLE group_messages ADD COLUMN \`url\` TEXT AFTER type`);
        }
        const [quoteCols]: any = await connection.query(`SHOW COLUMNS FROM group_messages LIKE 'quoted_message_id'`);
        if (quoteCols.length === 0) {
          await connection.query(`ALTER TABLE group_messages ADD COLUMN \`quoted_message_id\` INT AFTER url`);
        }
        const [agentCols]: any = await connection.query(`SHOW COLUMNS FROM group_messages LIKE 'agent_name'`);
        if (agentCols.length === 0) {
          await connection.query(`ALTER TABLE group_messages ADD COLUMN \`agent_name\` VARCHAR(255) AFTER sender_id`);
        }
      } catch (err) {
        console.warn('Migration for group_messages columns failed:', err);
      }
    } else {
      try {
        const info: any = await connection.query(`PRAGMA table_info(group_messages)`);
        const columns = info[0].map((c: any) => c.name);
        if (!columns.includes('url')) {
          await connection.query(`ALTER TABLE group_messages ADD COLUMN \`url\` TEXT`);
        }
        if (!columns.includes('quoted_message_id')) {
          await connection.query(`ALTER TABLE group_messages ADD COLUMN \`quoted_message_id\` INT`);
        }
        if (!columns.includes('agent_name')) {
          await connection.query(`ALTER TABLE group_messages ADD COLUMN \`agent_name\` VARCHAR(255)`);
        }
        // Migration: Ensure sender_id is nullable
        await connection.query(`ALTER TABLE group_messages MODIFY COLUMN \`sender_id\` INT NULL`);
      } catch (err) {}
    }

    // Migration: Fix group_messages.sender_id NOT NULL if it exists (MySQL)
    if (!isSqlite) {
      try {
        await connection.query(`ALTER TABLE group_messages MODIFY COLUMN \`sender_id\` INT NULL`);
      } catch (err) {
        console.warn('Migration: Failed to make group_messages.sender_id nullable:', err);
      }
    }

    // Migration for group_chats objective and agent_ids
    if (!isSqlite) {
      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM group_chats LIKE 'objective'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE group_chats ADD COLUMN \`objective\` TEXT AFTER leader_id`);
        }
        const [agentColumns]: any = await connection.query(`SHOW COLUMNS FROM group_chats LIKE 'agent_ids'`);
        if (agentColumns.length === 0) {
          await connection.query(`ALTER TABLE group_chats ADD COLUMN \`agent_ids\` TEXT AFTER objective`);
        }
      } catch (err) {
        console.warn('Migration for group_chats objective/agent_ids failed:', err);
      }
    } else {
      try {
        const info: any = await connection.query(`PRAGMA table_info(group_chats)`);
        const columns = info[0].map((c: any) => c.name);
        if (!columns.includes('objective')) {
          await connection.query(`ALTER TABLE group_chats ADD COLUMN \`objective\` TEXT`);
        }
        if (!columns.includes('agent_ids')) {
          await connection.query(`ALTER TABLE group_chats ADD COLUMN \`agent_ids\` TEXT`);
        }
      } catch (err) {}
    }

    // Migration: Add leader_id if not exists (MySQL only, SQLite handled by CREATE TABLE)
    if (!isSqlite) {
      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM users LIKE 'leader_id'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE users ADD COLUMN \`leader_id\` INT DEFAULT NULL AFTER status`);
          await connection.query(`ALTER TABLE users ADD CONSTRAINT fk_leader FOREIGN KEY (\`leader_id\`) REFERENCES users(\`id\`)`);
        }
      } catch (err) {
        console.warn('Migration for users table leader_id failed:', err);
      }

      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM users LIKE 'point_limit'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE users ADD COLUMN \`point_limit\` INT DEFAULT 0 AFTER leader_id`);
        }
      } catch (err) {
        console.warn('Migration for users table point_limit failed:', err);
      }
    }

    // Teams table
    await connection.query(`CREATE TABLE IF NOT EXISTS teams (
      \`id\` ${intPk},
      \`name\` VARCHAR(255) NOT NULL,
      \`leader_id\` INT NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`leader_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    // Migration for teams foreign key (ensure ON DELETE CASCADE)
    if (!isSqlite) {
      try {
        const [constraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = 'teams' AND COLUMN_NAME = 'leader_id' AND TABLE_SCHEMA = DATABASE()
        `);
        if (constraints.length > 0) {
          // Check if it's the old auto-named constraint then drop it
          for (const c of constraints) {
            if (c.CONSTRAINT_NAME === 'teams_ibfk_1' || c.CONSTRAINT_NAME.startsWith('teams_ibfk_')) {
              try {
                await connection.query(`ALTER TABLE teams DROP FOREIGN KEY ${c.CONSTRAINT_NAME}`);
                await connection.query(`ALTER TABLE teams ADD CONSTRAINT teams_leader_fk FOREIGN KEY (\`leader_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE`);
              } catch (e) {
                console.warn(`Failed to migrate constraint ${c.CONSTRAINT_NAME}:`, e);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Migration for teams foreign key failed:', err);
      }
    }

    // Team members table
    await connection.query(`CREATE TABLE IF NOT EXISTS team_members (
      \`id\` ${intPk},
      \`team_id\` INT NOT NULL,
      \`user_id\` INT NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`team_id\`) REFERENCES teams(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE,
      UNIQUE(\`team_id\`, \`user_id\`)
    )`);

    // Invitation codes table
    await connection.query(`CREATE TABLE IF NOT EXISTS invitation_codes (
      \`id\` ${intPk},
      \`code\` VARCHAR(20) UNIQUE,
      \`creator_id\` INT,
      \`max_uses\` INT DEFAULT 1,
      \`current_uses\` INT DEFAULT 0,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`creator_id\`) REFERENCES users(\`id\`) ON DELETE SET NULL
    )`);

    // History table
    await connection.query(`CREATE TABLE IF NOT EXISTS history (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`user_id\` INT,
      \`type\` VARCHAR(20),
      \`status\` VARCHAR(20),
      \`image_url\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`video_url\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`revised_prompt\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`is_optimized\` BOOLEAN,
      \`error\` TEXT,
      \`config\` ${isSqlite ? 'TEXT' : 'JSON'},
      \`ark_original_url\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`timestamp\` BIGINT,
      \`position\` ${isSqlite ? 'TEXT' : 'JSON'},
      \`hidden_from_canvas\` BOOLEAN,
      \`parent_id\` VARCHAR(255),
      \`canvas_id\` VARCHAR(255) DEFAULT 'default',
      \`operation_id\` VARCHAR(255),
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    // Migration: Add ark_original_url if not exists
    if (!isSqlite) {
      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM history LIKE 'ark_original_url'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`ark_original_url\` LONGTEXT AFTER config`);
        }
      } catch (err) {
        console.warn('Migration for history table ark_original_url failed:', err);
      }
    } else {
      try {
        const info: any = await connection.query(`PRAGMA table_info(history)`);
        const hasColumn = info[0].some((c: any) => c.name === 'ark_original_url');
        if (!hasColumn) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`ark_original_url\` TEXT`);
        }
      } catch (err) {
        console.warn('SQLite migration for history table ark_original_url failed:', err);
      }
    }

    // Migration: Add parent_id if not exists
    if (!isSqlite) {
      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM history LIKE 'parent_id'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`parent_id\` VARCHAR(255) AFTER hidden_from_canvas`);
        }
      } catch (err) {
        console.warn('Migration for history table parent_id failed:', err);
      }
    } else {
      try {
        const info: any = await connection.query(`PRAGMA table_info(history)`);
        const hasColumn = info[0].some((c: any) => c.name === 'parent_id');
        if (!hasColumn) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`parent_id\` TEXT`);
        }
      } catch (err) {
        console.warn('SQLite migration for history table parent_id failed:', err);
      }
    }

    // Migration: Add canvas_id if not exists
    if (!isSqlite) {
      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM history LIKE 'canvas_id'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`canvas_id\` VARCHAR(255) DEFAULT 'default' AFTER parent_id`);
        }
      } catch (err) {
        console.warn('Migration for history table canvas_id failed:', err);
      }
    } else {
      try {
        const info: any = await connection.query(`PRAGMA table_info(history)`);
        const hasColumn = info[0].some((c: any) => c.name === 'canvas_id');
        if (!hasColumn) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`canvas_id\` TEXT DEFAULT 'default'`);
        }
      } catch (err) {
        console.warn('SQLite migration for history table canvas_id failed:', err);
      }
    }

    // Migration: Add operation_id if not exists
    if (!isSqlite) {
      try {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM history LIKE 'operation_id'`);
        if (columns.length === 0) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`operation_id\` VARCHAR(255) AFTER canvas_id`);
        }
      } catch (err) {
        console.warn('Migration for history table operation_id failed:', err);
      }
    } else {
      try {
        const info: any = await connection.query(`PRAGMA table_info(history)`);
        const hasColumn = info[0].some((c: any) => c.name === 'operation_id');
        if (!hasColumn) {
          await connection.query(`ALTER TABLE history ADD COLUMN \`operation_id\` TEXT`);
        }
      } catch (err) {
        console.warn('SQLite migration for history table operation_id failed:', err);
      }
    }

    // Generation job ledger: server-owned source of truth for in-flight canvas tasks.
    await connection.query(`CREATE TABLE IF NOT EXISTS generation_jobs (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`user_id\` INT NOT NULL,
      \`history_id\` VARCHAR(255) NOT NULL,
      \`kind\` VARCHAR(50) NOT NULL,
      \`status\` VARCHAR(30) NOT NULL,
      \`external_task_id\` VARCHAR(255),
      \`request_payload\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`result_payload\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`error\` TEXT,
      \`created_at_ms\` BIGINT,
      \`updated_at_ms\` BIGINT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    if (!isSqlite) {
      try {
        await connection.query(`CREATE INDEX idx_generation_jobs_user_status ON generation_jobs (user_id, status)`);
      } catch (e) {}
      try {
        await connection.query(`CREATE INDEX idx_generation_jobs_user_history ON generation_jobs (user_id, history_id)`);
      } catch (e) {}
      try {
        await connection.query(`CREATE INDEX idx_generation_jobs_external_task ON generation_jobs (external_task_id)`);
      } catch (e) {}
    }

    // Update existing invitation codes to be single-use
    await connection.query(`UPDATE invitation_codes SET max_uses = 1 WHERE max_uses > 1`);

    // Pipelines table
    await connection.query(`CREATE TABLE IF NOT EXISTS pipelines (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`user_id\` INT,
      \`name\` VARCHAR(255),
      \`timestamp\` BIGINT,
      \`original_script\` TEXT,
      \`director_style\` VARCHAR(255),
      \`aspect_ratio\` VARCHAR(20),
      \`visual_style\` VARCHAR(255),
      \`image_quality\` VARCHAR(20),
      \`narrative_mode\` VARCHAR(20),
      \`target_segments\` INT,
      \`assets\` ${isSqlite ? 'TEXT' : 'JSON'},
      \`tasks\` ${isSqlite ? 'TEXT' : 'JSON'},
      \`segments\` ${isSqlite ? 'TEXT' : 'JSON'},
      \`global_rule\` TEXT,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    // Settings table
    await connection.query(`CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      \`value\` TEXT,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Usage logs table
    await connection.query(`CREATE TABLE IF NOT EXISTS usage_logs (
      \`id\` ${intPk},
      \`user_id\` INT,
      \`type\` VARCHAR(50),
      \`amount\` INT DEFAULT 0,
      \`details\` ${isSqlite ? 'TEXT' : 'JSON'},
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE
    )`);

    // Media comments table
    await connection.query(`CREATE TABLE IF NOT EXISTS media_comments (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`media_id\` VARCHAR(255) NOT NULL,
      \`username\` VARCHAR(255) NOT NULL,
      \`content\` TEXT NOT NULL,
      \`timestamp\` BIGINT NOT NULL,
      \`timecode\` VARCHAR(50) DEFAULT NULL,
      \`drawings\` ${isSqlite ? 'TEXT' : 'LONGTEXT'}
    )`);

    // Custom Skills table
    await connection.query(`CREATE TABLE IF NOT EXISTS ai_skills (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`desc\` TEXT,
      \`icon\` VARCHAR(50),
      \`instruction\` TEXT,
      \`creator_id\` INT,
      \`creator_name\` VARCHAR(255),
      \`is_public\` BOOLEAN DEFAULT TRUE,
      \`is_system\` BOOLEAN DEFAULT FALSE,
      \`tier\` VARCHAR(50) DEFAULT 'light',
      \`custom_options\` TEXT,
      \`category\` VARCHAR(50) DEFAULT 'text',
      \`enable_upload\` BOOLEAN DEFAULT FALSE,
      \`upload_type\` VARCHAR(50) DEFAULT 'all',
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`creator_id\`) REFERENCES users(\`id\`) ON DELETE SET NULL
    )`);

    try {
      await connection.query("ALTER TABLE ai_skills ADD COLUMN is_system BOOLEAN DEFAULT FALSE");
    } catch (e) {
      // Column might already exist
    }

    try {
      await connection.query("ALTER TABLE ai_skills ADD COLUMN tier VARCHAR(50) DEFAULT 'light'");
    } catch (e) {
      // Column might already exist
    }

    try {
      await connection.query("ALTER TABLE ai_skills ADD COLUMN custom_options TEXT");
    } catch (e) {
      // Column might already exist
    }

    try {
      await connection.query("ALTER TABLE ai_skills ADD COLUMN category VARCHAR(50) DEFAULT 'text'");
    } catch (e) {
      // Column might already exist
    }

    try {
      await connection.query("ALTER TABLE ai_skills ADD COLUMN enable_upload BOOLEAN DEFAULT FALSE");
    } catch (e) {
      // Column might already exist
    }

    try {
      await connection.query("ALTER TABLE ai_skills ADD COLUMN upload_type VARCHAR(50) DEFAULT 'all'");
    } catch (e) {
      // Column might already exist
    }

    // Shared Canvases table
    await connection.query(`CREATE TABLE IF NOT EXISTS shared_canvases (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`creator_id\` INT,
      \`creator_name\` VARCHAR(255),
      \`history\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`creator_id\`) REFERENCES users(\`id\`) ON DELETE SET NULL
    )`);

    // User's active/installed custom skills relation table
    await connection.query(`CREATE TABLE IF NOT EXISTS user_skills (
      \`user_id\` INT NOT NULL,
      \`skill_id\` VARCHAR(255) NOT NULL,
      PRIMARY KEY(\`user_id\`, \`skill_id\`),
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY(\`skill_id\`) REFERENCES ai_skills(\`id\`) ON DELETE CASCADE
    )`);

    // User preferences memory table
    await connection.query(`CREATE TABLE IF NOT EXISTS user_preferences (
      \`id\` ${intPk},
      \`user_id\` INT NOT NULL,
      \`pref_key\` VARCHAR(255) NOT NULL,
      \`pref_value\` TEXT,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE,
      UNIQUE(\`user_id\`, \`pref_key\`)
    )`);

    // Cloud package registry: formal source of truth for user-installed extension packages.
    await connection.query(`CREATE TABLE IF NOT EXISTS user_extension_packages (
      \`id\` ${intPk},
      \`user_id\` INT NOT NULL,
      \`kind\` VARCHAR(50) NOT NULL,
      \`package_id\` VARCHAR(255) NOT NULL,
      \`manifest_id\` VARCHAR(255),
      \`package_path\` VARCHAR(500),
      \`manifest\` ${isSqlite ? 'TEXT' : 'LONGTEXT'} NOT NULL,
      \`files\` ${isSqlite ? 'TEXT' : 'LONGTEXT'},
      \`storage_backend\` VARCHAR(50) DEFAULT 'database',
      \`storage_uri\` TEXT,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE,
      UNIQUE(\`user_id\`, \`kind\`, \`package_id\`)
    )`);

    if (!isSqlite) {
      try {
        await connection.query(`CREATE INDEX idx_user_extension_packages_user_kind ON user_extension_packages (user_id, kind)`);
      } catch (e) {}
      try {
        await connection.query(`CREATE INDEX idx_user_extension_packages_manifest ON user_extension_packages (manifest_id)`);
      } catch (e) {}
    }

    // System learnings memory table
    await connection.query(`CREATE TABLE IF NOT EXISTS system_learnings (
      \`id\` ${intPk},
      \`skill_id\` VARCHAR(255),
      \`learning_key\` VARCHAR(255),
      \`learning_value\` TEXT NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    if (!isSqlite) {
      try {
        await connection.query(`CREATE INDEX idx_media_comments_mid ON media_comments (media_id)`);
      } catch (e) {}
    }


    if (!isSqlite) {
      try {
        await connection.query(`CREATE INDEX idx_type_created ON usage_logs (type, created_at)`);
        await connection.query(`CREATE INDEX idx_user_type_created ON usage_logs (user_id, type, created_at)`);
      } catch (e) {}

      // Repair foreign key constraints to allow deletion of users
      try {
        // Fix teams table
        const [teamsConstraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teams' AND COLUMN_NAME = 'leader_id'
        `, [dbName]);
        for (const c of teamsConstraints) {
          await connection.query(`ALTER TABLE teams DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``).catch(() => {});
        }
        await connection.query(`ALTER TABLE teams ADD CONSTRAINT fk_teams_leader FOREIGN KEY (\`leader_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE`).catch(() => {});

        // Fix users table self-reference
        const [usersConstraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'leader_id'
        `, [dbName]);
        for (const c of usersConstraints) {
          await connection.query(`ALTER TABLE users DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``).catch(() => {});
        }
        await connection.query(`ALTER TABLE users ADD CONSTRAINT fk_users_leader FOREIGN KEY (\`leader_id\`) REFERENCES users(\`id\`) ON DELETE SET NULL`).catch(() => {});

        // Fix invitation_codes
        const [codesConstraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'invitation_codes' AND COLUMN_NAME = 'creator_id'
        `, [dbName]);
        for (const c of codesConstraints) {
          await connection.query(`ALTER TABLE invitation_codes DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``).catch(() => {});
        }
        await connection.query(`ALTER TABLE invitation_codes ADD CONSTRAINT fk_invitation_creator FOREIGN KEY (\`creator_id\`) REFERENCES users(\`id\`) ON DELETE SET NULL`).catch(() => {});

        // Fix history
        const [historyConstraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'history' AND COLUMN_NAME = 'user_id'
        `, [dbName]);
        for (const c of historyConstraints) {
          await connection.query(`ALTER TABLE history DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``).catch(() => {});
        }
        await connection.query(`ALTER TABLE history ADD CONSTRAINT fk_history_user FOREIGN KEY (\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE`).catch(() => {});

        // Fix pipelines
        const [pipelineConstraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pipelines' AND COLUMN_NAME = 'user_id'
        `, [dbName]);
        for (const c of pipelineConstraints) {
          await connection.query(`ALTER TABLE pipelines DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``).catch(() => {});
        }
        await connection.query(`ALTER TABLE pipelines ADD CONSTRAINT fk_pipelines_user FOREIGN KEY (\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE`).catch(() => {});

        // Fix usage_logs
        const [usageConstraints]: any = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usage_logs' AND COLUMN_NAME = 'user_id'
        `, [dbName]);
        for (const c of usageConstraints) {
          await connection.query(`ALTER TABLE usage_logs DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``).catch(() => {});
        }
        await connection.query(`ALTER TABLE usage_logs ADD CONSTRAINT fk_usage_user FOREIGN KEY (\`user_id\`) REFERENCES users(\`id\`) ON DELETE CASCADE`).catch(() => {});

        console.log('✅ Database foreign key constraints updated for CASCADE/SET NULL delete.');
      } catch (err) {
        console.warn('⚠️ Migration for database constraints failed:', err);
      }
    }

    // Dynamic bootstrapping via environment variables:
    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME;
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    if (defaultUsername && defaultPassword) {
      const [rows]: any = await connection.query('SELECT id FROM users WHERE username = ?', [defaultUsername]);
      
      if (rows.length === 0) {
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
        await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [defaultUsername, hashedPassword, 'admin']);
        console.log(`Default dynamic admin created: ${defaultUsername}`);
      } else {
        // Ensure role is admin
        await connection.query('UPDATE users SET role = "admin" WHERE username = ?', [defaultUsername]);
        console.log(`Admin role ensured for dynamic admin: ${defaultUsername}`);
      }
    } else {
      console.log('No DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD configured. Skipping admin bootstrapping.');
    }

    if (typeof connection.release === 'function') connection.release();
  } catch (error: any) {
    console.error('Failed to initialize database tables:', error);
    if (connection && typeof connection.release === 'function') connection.release();
  }
};

export const testDatabaseConnection = async (config: any): Promise<{ success: boolean; message: string }> => {
  let connection;
  try {
    const parsedConfig = parseDbConfig(
      config.host,
      parseInt(config.port || '3306'),
      config.user,
      config.password,
      config.database
    );

    connection = await mysql.createConnection({
      ...parsedConfig,
      connectTimeout: 10000
    });
    await connection.ping();
    await connection.end();
    return { success: true, message: '数据库连接测试成功！' };
  } catch (error: any) {
    console.error('Database Connection Test Error:', error);
    if (connection) await connection.end().catch(() => {});
    
    let message = `连接失败: ${error.message}`;
    
    if (error.code === 'ECONNREFUSED' && (error.address === '127.0.0.1' || error.address === 'localhost')) {
      message = "连接被拒绝: 无法连接到 127.0.0.1 (localhost)。请注意，此应用运行在容器中，无法直接连接到您本地电脑上的 MySQL。请使用远程 MySQL 数据库（如阿里云 RDS）并确保已设置白名单。";
    } else if (error.code === 'ETIMEDOUT') {
      message = "连接超时: 请检查您的数据库主机地址是否正确，并确保已在数据库防火墙中允许此应用的 IP 地址。";
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      message = "访问被拒绝: 请检查您的用户名和密码是否正确。";
    } else if (error.code === 'ENOTFOUND') {
      message = "未找到主机: 请检查您的数据库主机地址是否正确。";
    }
    
    return { success: false, message };
  }
};

export const repairDatabaseSchema = async (): Promise<{ success: boolean; message: string }> => {
  try {
    await initDb();
    return { success: true, message: 'Database schema repaired successfully.' };
  } catch (error: any) {
    console.error('Database Repair Error:', error);
    return { success: false, message: `Repair failed: ${error.message}` };
  }
};

export default dbWrapper;
