import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import createPool from '@/lib/db';
const pool = createPool();

const typeDefs = `#graphql
  type User {
    id: ID!
    permissions: String
    username: String
    role: String
    status: String
    zktime_id: Int
    departement: String
    email: String
    phone: String
    cin: String
    base_salary: Float
    photo: String
    cin_photo_front: String
    cin_photo_back: String
    is_blocked: Boolean
    nbmonth: Int
    is_coupure: Boolean
    is_fixed: Boolean
  }

  type Attendance {
    id: ID!
    zktime_id: Int
    username: String
    device_time: String
    user_id: Int
    created_at: String
  }

  type PersonnelStatus {
    user: User!
    attendance: Attendance
    clockIn: String
    clockOut: String
    state: String!
    shift: String
    lastPunch: String
    workedHours: String
    delay: String
    infraction: Float
    remarque: String
    is_blocked: Boolean
    schedule: UserSchedule
    absentDaysCount: Float
    daysLateCount: Float
  }

  type AttendanceRecord {
    date: String
    clockIn: String
    clockOut: String
    raw_punches: [String]
    shift: String
    hours: Float
  }

  type UserSchedule {
    user_id: ID!
    username: String
    dim: String
    lun: String
    mar: String
    mer: String
    jeu: String
    ven: String
    sam: String
    departement: String
    photo: String
    is_coupure: Boolean
    p1_in: String
    p1_out: String
    p2_in: String
    p2_out: String
    is_fixed: Boolean
    fixed_in: String
    fixed_out: String
  }

  input ScheduleInput {
    dim: String
    lun: String
    mar: String
    mer: String
    jeu: String
    ven: String
    sam: String
    is_coupure: Boolean
    p1_in: String
    p1_out: String
    p2_in: String
    p2_out: String
    is_fixed: Boolean
    fixed_in: String
    fixed_out: String
  }

  type Advance {
    id: ID!
    montant: Float
    username: String
    user_id: ID
    date: String
    month: String
    motif: String
    statut: String
  }

  type Retard {
    id: ID!
    user_id: ID
    username: String
    date: String
    reason: String
  }

  type Absent {
    id: ID!
    user_id: ID
    username: String
    date: String
    type: String
    reason: String
  }

  type Notification {
    id: ID!
    type: String!
    title: String!
    message: String!
    timestamp: String!
    read: Boolean!
    user_id: ID
    userDone: String
    url: String
  }

  input UserInput {
    username: String!
    email: String
    phone: String
    cin: String
    departement: String
    role: String
    zktime_id: Int
    status: String
    base_salary: Float
    photo: String
    is_blocked: Boolean
    permissions: String
    nbmonth: Int
    is_coupure: Boolean
    is_fixed: Boolean
  }

  type Extra {
    id: ID!
    user_id: ID
    username: String
    montant: Float
    date_extra: String
    motif: String
  }

  type Doublage {
    id: ID!
    user_id: ID
    username: String
    montant: Float
    date: String
  }

  type PayrollRecord {
    id: ID!
    user_id: ID
    username: String
    date: String
    present: Float
    acompte: Float
    extra: Float
    prime: Float
    infraction: Float
    doublage: Float
    mise_a_pied: Float
    retard: Int
    remarque: String
    clock_in: String
    clock_out: String
    updated: Boolean
    p1_in: String
    p1_out: String
    p2_in: String
    p2_out: String
    paid: Boolean
    salaire_net: Float
  }

  type PerformanceStats {
    user: User!
    totalHours: Float
    daysWorked: Float
    avgHoursPerDay: Float
    totalRetard: Int
    onTimeDays: Float
  }

  input PayrollInput {
    present: Float
    acompte: Float
    extra: Float
    prime: Float
    infraction: Float
    doublage: Float
    mise_a_pied: Float
    retard: Int
    remarque: String
    clock_in: String
    clock_out: String
    p1_in: String
    p1_out: String
    p2_in: String
    p2_out: String
    salaire_net: Float
  }

  type Query {
    personnelStatus(filter: String, date: String): [PersonnelStatus]
    userAttendanceHistory(userId: ID!, startDate: String!, endDate: String!): [AttendanceRecord]
    getUserSchedule(userId: ID!): UserSchedule
    getAllSchedules: [UserSchedule]
    getUsers: [User]
    getAdvances(filter: String, month: String): [Advance]
    getRetards(date: String, startDate: String, endDate: String): [Retard]
    getAbsents(date: String, startDate: String, endDate: String): [Absent]
    getExtras(month: String, startDate: String, endDate: String): [Extra]
    getDoublages(month: String, startDate: String, endDate: String): [Doublage]
    getPayroll(month: String!, userId: ID): [PayrollRecord]
    getUser(id: ID!): User
    getLogins: [User]
    getTopPerformers(month: String!): [PerformanceStats]
    login(username: String!, password: String!): LoginResult
    getCinCard(userId: ID!): CardCin
    getUserPhoto(userId: ID!): User
    getNotifications(userId: ID, limit: Int): [Notification]
  }

  type LoginResult {
    success: Boolean!
    message: String
    user: User
    token: String
  }

  type CardCin {
    id: ID!
    user_id: ID!
    cin_photo_front: String
    cin_photo_back: String
    uploaded_at: String
  }

  type Mutation {
    updateUserSchedule(userId: ID!, schedule: ScheduleInput!): UserSchedule
    addUser(input: UserInput!): User
    updateUser(id: ID!, input: UserInput!): User
    toggleUserBlock(userId: ID!, isBlocked: Boolean!): User
    updateUserPermissions(userId: ID!, permissions: String!): User
    deleteUser(id: ID!): Boolean
    addAdvance(montant: Float!, user_id: ID!, motif: String!, date: String): Advance
    updateAdvance(id: ID!, date: String, montant: Float, motif: String): Advance
    updateAdvanceStatus(id: ID!, statut: String!): Advance
    deleteAdvance(id: ID!): Boolean
    addRetard(user_id: ID!, date: String!, reason: String): Retard
    deleteRetard(id: ID!): Boolean
    updateRetard(id: ID!, reason: String!): Retard
    addAbsent(user_id: ID!, date: String!, type: String!, reason: String): Absent
    deleteAbsent(id: ID!): Boolean
    updateAbsent(id: ID!, type: String, reason: String): Absent
    syncAttendance(date: String, userId: ID, month: String): Boolean
    addExtra(user_id: ID!, montant: Float!, date_extra: String!, motif: String): Extra
    deleteExtra(id: ID!): Boolean
    updateExtra(id: ID!, montant: Float, motif: String, date_extra: String): Extra
    addDoublage(user_id: ID!, montant: Float!, date: String!): Doublage
    deleteDoublage(id: ID!): Boolean
    updateDoublage(id: ID!, montant: Float, date: String): Doublage
    initPayrollMonth(month: String!): Boolean
    updatePayrollRecord(month: String!, id: ID!, input: PayrollInput!): PayrollRecord
    uploadCinCard(userId: ID!, cinPhotoFront: String, cinPhotoBack: String): CardCin
    createLoginAccount(username: String!, password: String!, role: String!, permissions: String): User
    updateLoginAccount(id: ID!, username: String, password: String, role: String, permissions: String): User
    deleteLoginAccount(id: ID!): Boolean
    migratePayrollUpdatedColumn(month: String!): Boolean
    markNotificationsAsRead(userId: ID!): Boolean
    markNotificationsListAsRead(ids: [ID]!): Boolean
    markNotificationAsRead(id: ID!): Boolean
    deleteOldNotifications: Boolean
    pardonLate(userId: ID!, date: String!): PayrollRecord
    changePassword(userId: ID!, oldPassword: String!, newPassword: String!): Boolean
    payUser(month: String!, userId: ID!, netSalary: Float): Boolean
    unpayUser(month: String!, userId: ID!): Boolean
    updateNbMonth(userId: ID!, nbmonth: Int!): Boolean
  }
`;

// Helper to format timestamps to HH:mm
const formatTime = (dateValue: any) => {
  if (!dateValue) return null;

  // If it's a Date object, use its components directly to avoid TZ shifts
  // Machine timestamps are intended to be wall-clock local time
  if (dateValue instanceof Date) {
    const h = String(dateValue.getHours()).padStart(2, '0');
    const m = String(dateValue.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const str = String(dateValue);
  // If it's a raw machine string like "2025-12-29 07:15:00", just take the HH:mm
  if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    return str.substring(11, 16);
  }

  // Already HH:mm
  if (str.match(/^\d{2}:\d{2}$/)) {
    return str;
  }

  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;

    // For ISO strings (like .toISOString()), we WANT the shift to Tunis
    if (str.includes('T') || str.includes('Z')) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Africa/Tunis'
      });
    }

    // Default: use local components to avoid extra shift if it's already local
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch (e) { return str; }
};

const formatDuration = (mins: number) => {
  if (!mins || mins <= 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m} min`;
};

// Simple cache with TTL (Time To Live)
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

const getCached = (key: string): any | null => {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

const setCache = (key: string, data: any, ttl: number = 30000) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

const lastSyncThrottle = new Map<string, number>();

// Internal helper to invalidate backend cache
const invalidateCache = () => {
  (global as any)._statusCache = {};
  cache.clear(); // Also clear the new cache
};

// Return full ISO string for comparison
// We need full timestamp for "lastPunch" comparison, not just HH:mm
const formatFullTime = (dateStr: string) => {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString();
};

// Helper to format date only to YYYY-MM-DD using Local Time
const formatDateLocal = (dateInput: Date | string) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // Extract YYYY-MM-DD in Tunisia context regardless of server TZ
  const s = d.toLocaleDateString('fr-FR', { timeZone: 'Africa/Tunis', day: '2-digit', month: '2-digit', year: 'numeric' });
  const [dd, mm, yyyy] = s.split('/');
  return `${yyyy}-${mm}-${dd}`;
};

// Internal helper to ensure notifications table exists
let notificationsInitPromise: Promise<void> | null = null;
const ensureNotificationsTable = async () => {
  if (notificationsInitPromise) return notificationsInitPromise;

  notificationsInitPromise = (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.notifications (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read BOOLEAN DEFAULT FALSE,
          user_id INT,
          user_done VARCHAR(255),
          url TEXT
        )
      `);
      // Ensure columns exist (sequential to save connections)
      await pool.query('ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_done VARCHAR(255)');
      await pool.query('ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS url TEXT');
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)`);
      if (!(await pool.query("SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_timestamp'")).rowCount) {
        try { await pool.query(`CREATE INDEX idx_notifications_timestamp ON public.notifications(timestamp DESC)`); } catch (e) { }
      }
    } catch (e) {
      console.error("Notifications Table Creation Error:", e);
      notificationsInitPromise = null; // Allow retry on failure
    }
  })();

  return notificationsInitPromise;
};

// Internal helper to create notifications
const getTunisiaTime = () => {
  const d = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
};

const createNotification = async (type: string, title: string, message: string, userId: string | null = null, userDone: string | null = null, url: string | null = null, customTimestamp: string | null = null) => {
  try {
    await ensureNotificationsTable();
    const timestamp = customTimestamp || getTunisiaTime();

    await pool.query(
      `INSERT INTO public.notifications (type, title, message, user_id, user_done, url, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [type, title, message, userId, userDone, url, timestamp]
    );
  } catch (e) {
    console.error("Notification Error:", e);
  }
};

// Internal helper to clean old notifications (> 30 days)
const cleanOldNotifications = async () => {
  try {
    await pool.query("DELETE FROM public.notifications WHERE timestamp < NOW() - INTERVAL '30 days'");
  } catch (e) {
    console.error("Cleanup Error:", e);
  }
};

// Helper to format date and time to YYYY-MM-DDTHH:mm using Local Time
const formatDateTimeLocal = (dateInput: Date | string) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

// Helper to normalize machine timestamps to Tunis (+01:00) context
const parseMachineDate = (v: any) => {
  if (!v) return new Date();
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    // Re-construct as an ISO string with +01:00 timezone
    const s = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}T${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}.000+01:00`;
    return new Date(s);
  }
  if (typeof v === 'string') {
    if (v.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return new Date(v.replace(" ", "T") + ".000+01:00");
    }
    return new Date(v);
  }
  return new Date(v);
};

// Helper to determine shift
// Helper to get hour in Tunisia timezone (UTC+1)
const getTunisiaHour = (date: Date): number => {
  return parseInt(date.toLocaleTimeString('fr-FR', { hour: '2-digit', hour12: false, timeZone: 'Africa/Tunis' }));
};

const getTunisiaMinute = (date: Date): number => {
  return parseInt(date.toLocaleTimeString('fr-FR', { minute: '2-digit', hour12: false, timeZone: 'Africa/Tunis' }));
};

const determineShift = (first: Date, last: Date | null, isOngoing: boolean) => {
  if (!first) return "Non défini";

  const startHour = getTunisiaHour(first);

  // SOIR: Starts afternoon/evening (>= 14:00)
  // User definition: Entrée 15:00 -> Soir (We use 14 to allow early arrival)
  if (startHour >= 14) {
    return "Soir";
  }

  // MATIN vs DOUBLAGE (Starts < 15:00)

  // Calculate duration or "current lateness"
  const now = new Date();
  // Use 'last' if finished, else use 'now' for ongoing duration check
  const endTime = (isOngoing || !last) ? now : last;

  // If completed shift
  if (!isOngoing && last) {
    // Duration in hours
    const duration = (last.getTime() - first.getTime()) / (1000 * 60 * 60);

    // If they stayed very long (e.g. 5am to 4am next day = 23h, or 5am to 22pm = 17h)
    // Matin ends at 17:00 (12h duration).
    // Let's say overlap/buffer is around 14h.
    if (duration > 14) return "Doublage";

    return "Matin";
  }

  // If ONGOING shift
  if (isOngoing) {
    // Simple shift determination logic for live users
    const durationSoFar = (now.getTime() - first.getTime()) / (1000 * 60 * 60);
    const currentHour = getTunisiaHour(now);

    if (durationSoFar > 10 || currentHour >= 18 || currentHour < 7) {
      return "Doublage";
    }
    return "Matin";
  }

  return "Non défini";
};

const getLogicalDate = (date: Date) => {
  // If before 4AM Tunisia, it belongs to previous day
  const d = new Date(date);
  const h = getTunisiaHour(d);
  if (h < 4) {
    d.setDate(d.getDate() - 1);
  }
  // Standardize to 12:00 to avoid TZ edge case flips when just Y-M-D is extracted
  d.setHours(12, 0, 0, 0);
  return d;
};

// Helper to auto-create indexes on dynamic tables
const indexedTables = new Set<string>();
const ensureTableIndexes = async (tableName: string) => {
  if (indexedTables.has(tableName)) return;
  try {
    // Indexes for dynamic daily tables
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_device_time" ON public."${tableName}" (device_time)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_user_id" ON public."${tableName}" (user_id)`);
    indexedTables.add(tableName);
  } catch (e) { /* ignore if table doesn't exist yet */ }
};

let usersSchemaPromise: Promise<void> | null = null;
const ensureUsersSchema = async () => {
  if (usersSchemaPromise) return usersSchemaPromise;
  usersSchemaPromise = (async () => {
    try {
      await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_coupure BOOLEAN DEFAULT false');
      await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false');
    } catch (e) {
      console.error("ensureUsersSchema error:", e);
    }
  })();
  return usersSchemaPromise;
};

let staticIndexesPromise: Promise<void> | null = null;
const ensureStaticIndexes = async () => {
  if (staticIndexesPromise) return staticIndexesPromise;

  staticIndexesPromise = (async () => {
    try {
      await ensureUsersSchema();
      const queries = [
        `CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username)`,
        `CREATE INDEX IF NOT EXISTS idx_users_departement ON public.users("département")`,
        `CREATE INDEX IF NOT EXISTS idx_user_schedules_user_id ON public.user_schedules(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_avances_user_id_date ON public.avances(user_id, date)`,
        `CREATE INDEX IF NOT EXISTS idx_retards_user_id_date ON public.retards(user_id, date)`,
        `CREATE INDEX IF NOT EXISTS idx_absents_user_id_date ON public.absents(user_id, date)`,
        `CREATE INDEX IF NOT EXISTS idx_extras_user_id_date ON public.extras(user_id, date_extra)`,
        `CREATE INDEX IF NOT EXISTS idx_doublages_user_id_date ON public.doublages(user_id, date)`,
        `CREATE INDEX IF NOT EXISTS idx_avances_date ON public.avances(date)`,
        `CREATE INDEX IF NOT EXISTS idx_retards_date ON public.retards(date)`,
        `CREATE INDEX IF NOT EXISTS idx_absents_date ON public.absents(date)`,
        `CREATE INDEX IF NOT EXISTS idx_extras_date_extra ON public.extras(date_extra)`,
        `CREATE INDEX IF NOT EXISTS idx_doublages_date ON public.doublages(date)`,
        `ALTER TABLE public.extras ADD COLUMN IF NOT EXISTS motif TEXT`,
        `CREATE INDEX IF NOT EXISTS idx_extras_motif ON public.extras(motif)`,
        `CREATE TABLE IF NOT EXISTS public.doublages(
          id SERIAL PRIMARY KEY,
          user_id INT,
          username VARCHAR(100),
          montant FLOAT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_doublages_user_id_date_v2 ON public.doublages(user_id, date)`,
        `CREATE INDEX IF NOT EXISTS idx_doublages_date_v2 ON public.doublages(date)`
      ];
      // Run sequentially to avoid connection spike
      for (const q of queries) {
        try { await pool.query(q); } catch (e) { }
      }
      // Ensure user_schedules has new columns
      try {
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS is_coupure BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p1_in VARCHAR(10)`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p1_out VARCHAR(10)`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p2_in VARCHAR(10)`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS p2_out VARCHAR(10)`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS fixed_in VARCHAR(10)`);
        await pool.query(`ALTER TABLE public.user_schedules ADD COLUMN IF NOT EXISTS fixed_out VARCHAR(10)`);
      } catch (e) { }
    } catch (e) {
      console.error("Index creation error:", e);
      staticIndexesPromise = null;
    }
  })();

  return staticIndexesPromise;
};

const fetchDayPunches = async (logicalDate: Date, userId: string | null = null) => {
  // Construct table names
  const y1 = logicalDate.getFullYear();
  const m1 = String(logicalDate.getMonth() + 1).padStart(2, '0');
  const d1 = String(logicalDate.getDate()).padStart(2, '0');
  const table1 = `${y1}_${m1}_${d1}`;

  const nextDay = new Date(logicalDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const y2 = nextDay.getFullYear();
  const m2 = String(nextDay.getMonth() + 1).padStart(2, '0');
  const d2 = String(nextDay.getDate()).padStart(2, '0');
  const table2 = `${y2}_${m2}_${d2}`;

  // Time boundaries - Strict 24h window starting at 04:00 AM
  const startStr = `${y1}-${m1}-${d1} 04:00:00`;
  const endStr = `${y2}-${m2}-${d2} 04:00:00`;

  let punches: any[] = [];

  // Query both tables in parallel
  const [res1, res2] = await Promise.all([
    (async () => {
      // Try to ensure index, but don't block query if it fails
      try { await ensureTableIndexes(table1); } catch (e) { console.error(`Index creation failed for ${table1}`, e); }

      try {
        let q1 = `SELECT device_time, user_id FROM public."${table1}" WHERE device_time >= $1 AND device_time < $2`;
        const params1 = [startStr, endStr];
        if (userId) {
          q1 += ` AND user_id = $3`;
          params1.push(userId);
        }
        q1 += ` ORDER BY device_time ASC`;
        return await pool.query(q1, params1);
      } catch (e: any) {
        // Suppress "relation does not exist" error as it's expected for future/missing tables
        if (!e.message.includes('does not exist')) {
          console.error(`[fetchDayPunches] Error fetching from ${table1}:`, e.message);
        }
        return { rows: [] };
      }
    })(),
    (async () => {
      // Try to ensure index, but don't block query if it fails
      try { await ensureTableIndexes(table2); } catch (e) { /* ignore */ }

      try {
        let q2 = `SELECT device_time, user_id FROM public."${table2}" WHERE device_time >= $1 AND device_time < $2`;
        const params2 = [startStr, endStr];
        if (userId) {
          q2 += ` AND user_id = $3`;
          params2.push(userId);
        }
        q2 += ` ORDER BY device_time ASC`;
        return await pool.query(q2, params2);
      } catch (e: any) {
        // Suppress "relation does not exist" error
        if (!e.message.includes('does not exist')) {
          console.error(`[fetchDayPunches] Error fetching from ${table2}:`, e.message);
        }
        return { rows: [] };
      }
    })()
  ]);

  const allRows = [...res1.rows, ...res2.rows];

  // Deduplicate punches: if same user punches within 5 minutes, keep only the first one
  const cleaned: any[] = [];
  const lastPunchByUser = new Map<number, number>();

  // Sort by time just in case
  allRows.sort((a, b) => new Date(a.device_time).getTime() - new Date(b.device_time).getTime());

  for (const p of allRows) {
    const userId = Number(p.user_id);
    const punchTime = new Date(p.device_time).getTime();
    const lastTime = lastPunchByUser.get(userId);

    if (lastTime === undefined || (punchTime - lastTime) > 5 * 60 * 1000) {
      cleaned.push(p);
      lastPunchByUser.set(userId, punchTime);
    }
  }

  return cleaned;
};

const initializedMonths = new Set();
const inProgressInitializations = new Map();

async function initializePayrollTable(month: string) {
  if (initializedMonths.has(month)) return true;
  if (inProgressInitializations.has(month)) return inProgressInitializations.get(month);

  const tableName = `paiecurrent_${month}`;

  // Ensure table and latest columns exist, then fill gaps if any

  const initPromise = (async () => {
    const tableName = `paiecurrent_${month}`;
    if (!/^\d{4}_\d{2}$/.test(month)) throw new Error("Format de mois invalide. Utilisez YYYY_MM");

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lockId = 123456789 + parseInt(month.replace('_', ''));
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);

      await client.query(`
        CREATE TABLE IF NOT EXISTS public.doublages(
        id SERIAL PRIMARY KEY,
        user_id INT,
        username VARCHAR(100),
        montant FLOAT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS public."${tableName}"(
          id SERIAL PRIMARY KEY,
          user_id INT,
          username VARCHAR(100),
          date DATE,
          present FLOAT DEFAULT 0,
          acompte FLOAT DEFAULT 0,
          extra FLOAT DEFAULT 0,
          prime FLOAT DEFAULT 0,
          infraction FLOAT DEFAULT 0,
          doublage FLOAT DEFAULT 0,
          mise_a_pied FLOAT DEFAULT 0,
          retard INT DEFAULT 0,
          remarque TEXT,
          clock_in VARCHAR(50),
          clock_out VARCHAR(50),
          updated BOOLEAN DEFAULT FALSE,
          paid boolean NOT NULL DEFAULT false,
          p2_in VARCHAR(50),
          p2_out VARCHAR(50),
          salaire_net FLOAT DEFAULT 0,
          UNIQUE(user_id, date)
        )
      `);
      try {
        await client.query(`ALTER TABLE public."${tableName}" ALTER COLUMN present TYPE FLOAT`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS retard INT DEFAULT 0`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS prime FLOAT DEFAULT 0`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS infraction FLOAT DEFAULT 0`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS doublage FLOAT DEFAULT 0`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS mise_a_pied FLOAT DEFAULT 0`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS clock_in VARCHAR(50)`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS clock_out VARCHAR(50)`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS updated BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p1_in VARCHAR(50)`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p1_out VARCHAR(50)`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p2_in VARCHAR(50)`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS p2_out VARCHAR(50)`);
        await client.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS salaire_net FLOAT DEFAULT 0`);

        await client.query(`
          DO $$
          BEGIN 
            IF EXISTS(
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = '${tableName}' AND column_name = 'mise_a_pied' AND data_type = 'boolean'
            ) THEN
              ALTER TABLE public."${tableName}" ALTER COLUMN mise_a_pied DROP DEFAULT;
              ALTER TABLE public."${tableName}" ALTER COLUMN mise_a_pied TYPE FLOAT USING(CASE WHEN mise_a_pied THEN 1.0 ELSE 0.0 END);
              ALTER TABLE public."${tableName}" ALTER COLUMN mise_a_pied SET DEFAULT 0;
            END IF;
          END $$;
        `);
      } catch (e) {
        console.error("Self-healing schema error:", e);
      }

      const [year, monthIdx] = month.split('_').map(Number);
      const daysInMonth = new Date(year, monthIdx, 0).getDate();
      const usersRes = await client.query('SELECT id, username FROM public.users');

      const userIds: number[] = [];
      const usernames: string[] = [];
      const dates: string[] = [];

      for (const user of usersRes.rows) {
        for (let d = 1; d <= daysInMonth; d++) {
          userIds.push(user.id);
          usernames.push(user.username);
          dates.push(`${year}-${String(monthIdx).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
      }

      if (userIds.length > 0) {
        await client.query(`
          INSERT INTO public."${tableName}"(user_id, username, date) 
          SELECT * FROM unnest($1::int[], $2::text[], $3::date[]) 
          ON CONFLICT (user_id, date) DO NOTHING
        `, [userIds, usernames, dates]);
      }
      await client.query('COMMIT');
      initializedMonths.add(month);
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })();

  inProgressInitializations.set(month, initPromise);
  try {
    return await initPromise;
  } finally {
    inProgressInitializations.delete(month);
  }
}

async function recomputePayrollForDate(targetDateStr: string, specificUserId: string | null = null) {
  invalidateCache();
  const todayNow = new Date();
  const targetDate = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date();
  const logicalDay = getLogicalDate(targetDate);
  const dayOfWeekIndex = logicalDay.getDay();
  const dateSQL = formatDateLocal(logicalDay); // YYYY-MM-DD
  if (!dateSQL) return;

  const monthKey = dateSQL.substring(0, 7).replace('-', '_');
  // Need to ensure table exists
  await Promise.all([
    initializePayrollTable(monthKey),
    ensureUsersSchema()
  ]);

  const dayCols = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const dayCol = dayCols[dayOfWeekIndex];

  // Fetch all data in parallel to minimize round-trip latency
  const nextDateSQL = formatDateLocal(new Date(logicalDay.getTime() + 86400000));
  const userClause = specificUserId ? ' AND user_id = $3 ' : '';
  const subParams = specificUserId ? [dateSQL, nextDateSQL, specificUserId] : [dateSQL, nextDateSQL];

  const [usersRes, schedulesRes, allPunches, retardsRes, absentsRes, advancesRes, extrasRes, doublagesRes, notificationsRes] = await Promise.all([
    pool.query(specificUserId ? 'SELECT id, username, "département" as departement, is_coupure, is_fixed FROM public.users WHERE id = $1' : 'SELECT id, username, "département" as departement, is_coupure, is_fixed FROM public.users', specificUserId ? [specificUserId] : []),
    pool.query(specificUserId ? 'SELECT * FROM public.user_schedules WHERE user_id = $1' : 'SELECT * FROM public.user_schedules', specificUserId ? [specificUserId] : []),
    fetchDayPunches(logicalDay, specificUserId),
    pool.query(`SELECT * FROM public.retards WHERE date >= $1 AND date < $2 ${userClause}`, subParams),
    pool.query(`SELECT * FROM public.absents WHERE date >= $1 AND date < $2 ${userClause}`, subParams),
    pool.query(`SELECT user_id, SUM(montant) as total FROM public.avances WHERE date >= $1 AND date < $2 AND (statut = 'Payé' OR statut = 'Validé' OR statut = 'En attente') ${userClause} GROUP BY user_id`, subParams),
    pool.query(`SELECT * FROM public.extras WHERE date_extra >= $1 AND date_extra < $2 ${userClause}`, subParams),
    pool.query(`SELECT user_id, SUM(montant) as total FROM public.doublages WHERE date >= $1 AND date < $2 ${userClause} GROUP BY user_id`, subParams),
    pool.query("SELECT message FROM public.notifications WHERE timestamp >= $1 AND timestamp < $2", [dateSQL, nextDateSQL])
  ]);

  const users = usersRes.rows;
  const schedules = schedulesRes.rows;
  const notificationMessages = new Set<string>(notificationsRes.rows.map((n: any) => String(n.message)));

  const retardsMap = new Map<number, any>();
  retardsRes.rows.forEach((r: any) => retardsMap.set(Number(r.user_id), r));

  const absentsMap = new Map<number, any[]>();
  absentsRes.rows.forEach((a: any) => {
    const uid = Number(a.user_id);
    if (!absentsMap.has(uid)) absentsMap.set(uid, []);
    absentsMap.get(uid)!.push(a);
  });

  const advancesMap = new Map<number, number>();
  advancesRes.rows.forEach((a: any) => advancesMap.set(Number(a.user_id), parseFloat(a.total || 0)));

  const extrasMap = new Map<number, any[]>();
  extrasRes.rows.forEach((e: any) => {
    const uid = Number(e.user_id);
    if (!extrasMap.has(uid)) extrasMap.set(uid, []);
    extrasMap.get(uid)!.push(e);
  });

  const doublagesMap = new Map<number, number>();
  doublagesRes.rows.forEach((d: any) => doublagesMap.set(Number(d.user_id), parseFloat(d.total || 0)));

  const schedulesMap = new Map<number, any>();
  schedulesRes.rows.forEach((s: any) => schedulesMap.set(Number(s.user_id), s));

  // Group punches by user_id
  const punchesByUser = new Map();
  allPunches.forEach((p: any) => {
    const uid = Number(p.user_id);
    if (!punchesByUser.has(uid)) punchesByUser.set(uid, []);
    punchesByUser.get(uid).push(p);
  });

  const payrollTableName = `paiecurrent_${monthKey}`;

  // Pre-fetch 'updated' flags for all relevant users in one go
  const updatedFlagsQ = `SELECT user_id, updated FROM public."${payrollTableName}" WHERE date = $1 ${specificUserId ? ' AND user_id = $2 ' : ''}`;
  const updatedFlagsP = specificUserId ? [dateSQL, specificUserId] : [dateSQL];
  const updatedFlagsRes = await pool.query(updatedFlagsQ, updatedFlagsP);
  const updatedFlagsMap = new Map<number, boolean>();
  updatedFlagsRes.rows.forEach((r: any) => updatedFlagsMap.set(Number(r.user_id), !!r.updated));

  // Process all users in parallel to minimize round-trip latency
  const pendingNotifications: any[] = [];
  const usersData = await Promise.all(users.map(async (user: any) => {
    const userIdNum = Number(user.id);
    let userPunches = punchesByUser.get(userIdNum) || [];
    userPunches.sort((a: any, b: any) => new Date(a.device_time).getTime() - new Date(b.device_time).getTime());

    const schedule = schedulesMap.get(userIdNum);
    let shiftType = schedule ? schedule[dayCol] : "Repos";

    // Override Repos if they actually came to work, so we calculate Retards
    if (userPunches.length > 0 && shiftType === "Repos") {
      shiftType = "Matin";
    }

    // Dynamic Shift Detection Override
    if (userPunches.length > 0) {
      const now = new Date();
      const logicalToday = getLogicalDate(now);
      const isLogicalToday = dateSQL === formatDateLocal(logicalToday);

      if (isLogicalToday) {
        const lastP = userPunches[userPunches.length - 1];
        const pTimeStr = lastP.device_time;
        const type = userPunches.length % 2 !== 0 ? 'entrée' : 'sortie';
        const msgKey = `PUNCH_LOG:${user.id}_${pTimeStr}`;

        // Use the Set instead of a query
        const exists = Array.from(notificationMessages).some((m: string) => m.includes(msgKey));
        if (!exists) {
          const finalUid = user.id || user.user_id;
          // defer creation to ensure order
          pendingNotifications.push({
            type: 'pointage',
            title: `Pointage ${type}`,
            message: `${user.username} a pointé son ${type} à ${formatTime(pTimeStr)}. [REF:${msgKey}]`,
            userId: finalUid,
            userDone: "Machine ZKTeco",
            url: `/attendance?userId=${finalUid}&date=${dateSQL}`,
            timestamp: pTimeStr
          });
          notificationMessages.add(`[REF:${msgKey}]`); // Add to local set to avoid duplicates in same run
        }
      }

      const firstP = userPunches[0];
      const firstD = parseMachineDate(firstP.device_time);
      const sTypeUpper = (shiftType || "").toUpperCase();
      const firstHour = getTunisiaHour(firstD);
      if (firstHour >= 14) {
        shiftType = "Soir";
      } else if (firstHour < 14 && sTypeUpper === "SOIR") {
        shiftType = "Matin";
      }
    }

    // MODE COUPURE LOGIC
    // (using already fetched 'schedule' and 'user' record)
    const isCoupure = (!!schedule?.is_coupure) || (!!user.is_coupure);
    let coupureP1In = null, coupureP1Out = null, coupureP2In = null, coupureP2Out = null;

    if (isCoupure && userPunches.length > 0) {
      // User has 4 expected fingers. Let's try to map them to P1 and P2 segments.
      // Reference times from schedule
      let cutoffHour = 13;
      if (user.departement === 'Chef_Cuisine') cutoffHour = 16;

      // Match punches to segments.
      const p1_punches = userPunches.filter((p: any) => getTunisiaHour(parseMachineDate(p.device_time)) < cutoffHour);
      const p2_punches = userPunches.filter((p: any) => getTunisiaHour(parseMachineDate(p.device_time)) >= cutoffHour);

      if (p1_punches.length > 0) {
        coupureP1In = formatTime(p1_punches[0].device_time);
        if (p1_punches.length > 1) {
          coupureP1Out = formatTime(p1_punches[p1_punches.length - 1].device_time);
        }
      }
      if (p2_punches.length > 0) {
        coupureP2In = formatTime(p2_punches[0].device_time);
        if (p2_punches.length > 1) {
          coupureP2Out = formatTime(p2_punches[p2_punches.length - 1].device_time);
        }
      }
    }

    let isAbsent = false;
    let isRetard = false;
    let reason = "";
    let calculatedRetardMins = 0;

    const todayNow = new Date();
    const currentLogicalDate = getLogicalDate(todayNow);
    const isPastDay = logicalDay.getTime() < currentLogicalDate.getTime();

    if (shiftType !== "Repos") {
      if (user.departement === 'Chef_Cuisine') {
        let totalRetard = 0;
        const shift1Start = new Date(`${dateSQL}T11:00:00.000+01:00`);
        const shift2Start = new Date(`${dateSQL}T19:00:00.000+01:00`);

        const p1 = userPunches.find((p: any) => {
          const d = parseMachineDate(p.device_time);
          const h = getTunisiaHour(d);
          return h >= 4 && h < 15;
        });
        if (p1) {
          const d1 = parseMachineDate(p1.device_time);
          if (d1 > shift1Start) {
            const diff = Math.floor((d1.getTime() - shift1Start.getTime()) / 60000);
            if (diff > 0) totalRetard += diff;
          }
        }

        const p2 = userPunches.find((p: any) => {
          const d = parseMachineDate(p.device_time);
          const h = getTunisiaHour(d);
          return h >= 16;
        });
        if (p2) {
          const d2 = parseMachineDate(p2.device_time);
          if (d2 > shift2Start) {
            const diff = Math.floor((d2.getTime() - shift2Start.getTime()) / 60000);
            if (diff > 0) totalRetard += diff;
          }
        }

        if (totalRetard > 0) {
          isRetard = true;
          reason = formatDuration(totalRetard);
          calculatedRetardMins = totalRetard;
        }

        if (userPunches.length === 0) {
          const cutOffTime = new Date(logicalDay);
          cutOffTime.setHours(23, 0, 0, 0);
          if (isPastDay || todayNow > cutOffTime) {
            isAbsent = true;
            reason = "Absence injustifiée (Chef)";
          }
        }
      }

      if (isCoupure && user.departement !== 'Chef_Cuisine') {
        // Evaluate 2-part lateness
        const s_p1_in = schedule.p1_in || "08:00";
        const s_p2_in = schedule.p2_in || "14:00";

        let totalRetard = 0;

        // P1 Lateness
        if (coupureP1In) {
          const shiftStartTime = new Date(`${dateSQL}T${s_p1_in}:00.000+01:00`);
          const punchTime = new Date(`${dateSQL}T${coupureP1In}:00.000+01:00`);
          if (punchTime > shiftStartTime) {
            totalRetard += Math.floor((punchTime.getTime() - shiftStartTime.getTime()) / 60000);
          }
        }

        // P2 Lateness
        if (coupureP2In) {
          const shiftStartTime = new Date(`${dateSQL}T${s_p2_in}:00.000+01:00`);
          const punchTime = new Date(`${dateSQL}T${coupureP2In}:00.000+01:00`);
          if (punchTime > shiftStartTime) {
            totalRetard += Math.floor((punchTime.getTime() - shiftStartTime.getTime()) / 60000);
          }
        }

        if (totalRetard > 0) {
          isRetard = true;
          reason = formatDuration(totalRetard);
          calculatedRetardMins = totalRetard;
        }

        // Absence check for Coupure
        if (userPunches.length === 0) {
          if (isPastDay || todayNow > new Date(`${dateSQL}T12:00:00.000+01:00`)) {
            isAbsent = true;
            reason = "Absence injustifiée (Coupure)";
          }
        }
      }

      // Mutual presence score check for ALL coupure users (including Chefs)
      if (isCoupure && userPunches.length > 0) {
        let presenceScore = 0;
        if (coupureP1In) presenceScore += 0.5;
        if (coupureP2In) presenceScore += 0.5;

        if (presenceScore < 1 && isPastDay) {
          if (presenceScore === 0) {
            isAbsent = true;
          } else {
            if (!coupureP1In) reason = (reason ? reason + " + " : "") + "P1 Absent";
            if (!coupureP2In) reason = (reason ? reason + " + " : "") + "P2 Absent";
          }
        }
      }

      // MODE FIXE LOGIC
      const isFixed = (!!schedule?.is_fixed) || (!!user.is_fixed);
      if (isFixed && !isCoupure && user.departement !== 'Chef_Cuisine') {
        const s_fixed_in = schedule?.fixed_in || "08:00";
        const s_fixed_out = schedule?.fixed_out || "17:00";

        if (userPunches.length === 0) {
          const shiftStartTimeAbs = new Date(`${dateSQL}T${s_fixed_in}:00.000+01:00`);
          const thresholdTime = new Date(shiftStartTimeAbs.getTime() + 30 * 60000);

          if (isPastDay || todayNow > thresholdTime) {
            isAbsent = true;
            reason = `Absence injustifiée (Fixe @ ${s_fixed_in})`;
          }
        } else {
          const firstP = userPunches[0];
          const firstD = parseMachineDate(firstP.device_time);
          const shiftStartTime = new Date(`${dateSQL}T${s_fixed_in}:00.000+01:00`);

          if (firstD > shiftStartTime) {
            const diffMs = firstD.getTime() - shiftStartTime.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins > 0) {
              isRetard = true;
              reason = formatDuration(diffMins);
              calculatedRetardMins = diffMins;
            }
          }

          if (isPastDay && userPunches.length % 2 !== 0) {
            isAbsent = true;
            isRetard = false;
            reason = "Pointage de sortie manquant (Fixe)";
          }
        }
      }

      if (!isCoupure && !isFixed && user.departement !== 'Chef_Cuisine') {
        const sTypeUpper = (shiftType || "").toUpperCase();
        let startHour = 7;
        if (sTypeUpper === "SOIR") startHour = 16;


        const shiftStartTime = new Date(`${dateSQL}T${String(startHour).padStart(2, "0")}:00:00.000+01:00`);

        if (userPunches.length === 0) {
          const isMatinOrDoublage = sTypeUpper === "MATIN" || sTypeUpper === "DOUBLAGE";
          const shiftStartHour = isMatinOrDoublage ? 7 : 16;
          const shiftStartMin = 0;
          const shiftStartTimeAbs = new Date(`${dateSQL}T${String(shiftStartHour).padStart(2, "0")}:00:00.000+01:00`);

          // Threshold of 30 minutes late to consider auto-absent
          const thresholdTime = new Date(shiftStartTimeAbs.getTime() + 30 * 60000);

          const shiftEndHour = isMatinOrDoublage ? 16 : 23;
          const shiftEndTime = new Date(logicalDay);
          shiftEndTime.setHours(shiftEndHour, 0, 0, 0);

          if (isPastDay || todayNow > thresholdTime) {
            isAbsent = true;
            reason = "Absence injustifiée";
          }
        } else {
          const firstP = userPunches[0];
          const firstD = parseMachineDate(firstP.device_time);

          if (firstD > shiftStartTime) {
            const diffMs = firstD.getTime() - shiftStartTime.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins > 0) {
              isRetard = true;
              reason = formatDuration(diffMins);
              calculatedRetardMins = diffMins;
            }
          }

          if (isPastDay && userPunches.length % 2 !== 0) {
            isAbsent = true;
            isRetard = false;
            reason = "Pointage de sortie manquant";
          }
        }
      }
    }

    const isManuallyUpdated = updatedFlagsMap.get(userIdNum) === true;

    // Determine state and reasons...
    // Only update tables if NOT manually updated
    if (!isManuallyUpdated) {
      if (shiftType !== "Repos") {
        // Clear potential conflictual records before re-inserting
        await pool.query('DELETE FROM public.absents WHERE user_id = $1 AND date = $2', [user.id, dateSQL]);
        await pool.query('DELETE FROM public.retards WHERE date::date = $1 AND user_id = $2', [dateSQL, user.id]);

        if (isAbsent) {
          await pool.query(`
              INSERT INTO public.absents(user_id, username, date, type, reason) 
              VALUES($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, date) DO UPDATE SET
              type = EXCLUDED.type,
              reason = EXCLUDED.reason
            `, [user.id, user.username, dateSQL, "Absence", reason]);
        } else if (isRetard) {
          const punchTime = userPunches[0].device_time;
          await pool.query(`
              INSERT INTO public.retards(user_id, username, date, reason) 
              VALUES($1, $2, $3, $4)
              ON CONFLICT (user_id, (date::date)) DO UPDATE SET
              date = EXCLUDED.date,
              reason = EXCLUDED.reason
            `, [user.id, user.username, punchTime, reason]);
        }
      }
    }

    // FINAL PAYROLL TABLE UPDATE
    const userAbsentsForPay = absentsMap.get(userIdNum) || [];

    let currentAbsent = userAbsentsForPay.sort((a: any, b: any) => {
      const order: any = { 'Présent': 1, 'Justifié': 2, 'Injustifié': 3, 'Mise à pied': 4 };
      return (order[a.type] || 5) - (order[b.type] || 5);
    })[0];


    const currentRetard = retardsMap.get(userIdNum);

    let retardMins = calculatedRetardMins;
    // Only fallback to DB record if we DIDN'T calculate a retard in this run
    if (!isRetard && currentRetard) {
      const m = currentRetard.reason || "";
      if (m.includes("h")) {
        const hMatch = m.match(/(\d+)h/);
        const minMatch = m.match(/(\d+)m/);
        const h = hMatch ? parseInt(hMatch[1]) : 0;
        const mins = minMatch ? parseInt(minMatch[1]) : 0;
        retardMins = h * 60 + mins;
      } else {
        const match = m.match(/(\d+)/);
        retardMins = match ? parseInt(match[1]) : 0;
      }
    }

    const isPresentType = (type: string) => {
      const t = (type || "").toLowerCase().trim();
      return t === "présent" || t === "present" || t === "justifié" || t === "justifie";
    };
    const isAbsentType = (type: string) => {
      const t = (type || "").toLowerCase().trim();
      const deduct = ['absence', 'absent', 'injustifié', 'injustifie', 'non justifié', 'non justifie', 'mise à pied', 'mise a pied', 'injustice'];
      return deduct.includes(t);
    };

    const userExtras = extrasMap.get(userIdNum) || [];
    let dayExtra = 0;
    let dayPrime = 0;
    let dayInfraction = 0;
    let hasManualInfraction = false;

    userExtras.forEach((r: any) => {
      const motif = (r.motif || "").toLowerCase();
      if (motif.startsWith("prime")) dayPrime += parseFloat(r.montant || 0);
      else if (motif.startsWith("infraction")) {
        dayInfraction += parseFloat(r.montant || 0);
        hasManualInfraction = true;
      }
      else dayExtra += parseFloat(r.montant || 0);
    });

    // Priority: use NEWLY calculated values if we have punches or an auto-detected status
    let finalPresent = 0;
    if (userPunches.length > 0) {
      if (isCoupure) {
        let presenceScore = 0;
        if (coupureP1In) presenceScore += 0.5;
        if (coupureP2In) presenceScore += 0.5;
        finalPresent = presenceScore;
      } else {
        finalPresent = 1;
      }
    }

    // Manual or Auto overlays
    if (dayExtra > 0) finalPresent = 0;
    if (shiftType === "Repos") finalPresent = 0;
    if (isAbsent) finalPresent = 0;

    // overlay from absents table (manual overrides)
    if (currentAbsent && (isAbsentType(currentAbsent.type) || isPresentType(currentAbsent.type))) {
      // Only let the DB record override if we HAVE NO punches or if it's a specific manual type like Mise a pied
      const isManualOverrideType = currentAbsent.type === 'Mise à pied' || currentAbsent.type === 'Chômage' || currentAbsent.type === 'Accident';
      if (userPunches.length === 0 || isManualOverrideType) {
        if (isAbsentType(currentAbsent.type)) finalPresent = 0;
        else finalPresent = 1;
      }
    }

    // Final Remark prioritization
    let finalRemark = (isAbsent || isRetard) ? reason : null;
    if (!finalRemark) {
      finalRemark = currentRetard?.reason || currentAbsent?.reason || null;
    }

    let autoInfraction = (retardMins > 10) ? 30 : 0;
    const totalAdvance = advancesMap.get(userIdNum) || 0;
    let dayDoublage = doublagesMap.get(userIdNum) || 0;

    const miseAPiedRecord = userAbsentsForPay.find((a: any) => a.type === 'Mise à pied');
    let miseAPiedDays = 0;
    if (miseAPiedRecord) {
      const match = miseAPiedRecord.reason?.match(/(\d+(\.\d+)?)\s*jour/i);
      miseAPiedDays = match ? parseFloat(match[1]) : 1;
    }

    // Only apply Auto Infraction if NO manual infraction overrides exist
    if (!hasManualInfraction) {
      dayInfraction += autoInfraction;
    }
    // Ensure non-negative
    dayInfraction = Math.max(0, dayInfraction);

    // Calculate clock_in and clock_out from punches
    let clockIn = null;
    let clockOut = null;
    if (userPunches.length > 0) {
      clockIn = formatTime(userPunches[0].device_time);
      if (userPunches.length > 1) {
        clockOut = formatTime(userPunches[userPunches.length - 1].device_time);
      }
    }

    // Even if it's the current day, if it's manually updated, we should be careful.
    // However, for the current day, we prioritize live data from ZK machine.

    const isManuallyUpdatedInDB = !!updatedFlagsMap.get(userIdNum);
    const forceUpdated = isManuallyUpdatedInDB || dayExtra > 0;

    return {
      finalPresent, totalAdvance, dayExtra, dayPrime, dayInfraction, dayDoublage, miseAPiedDays, retardMins, finalRemark,
      userId: user.id, dateSQL, username: user.username, clockIn, clockOut, forceUpdated,
      coupureP1In, coupureP1Out, coupureP2In, coupureP2Out
    };
  }));

  // BATCH UPDATE PAYROLL TABLE
  if (usersData.length > 0) {
    const val = (key: string) => usersData.map((d: any) => d[key]);
    await pool.query(
      `INSERT INTO public."${payrollTableName}"(
        present, acompte, extra, prime, infraction, doublage, mise_a_pied, retard, remarque,
        user_id, date, username, clock_in, clock_out, updated, p1_in, p1_out, p2_in, p2_out
      )
      SELECT * FROM unnest(
        $1::float[], $2::float[], $3::float[], $4::float[], $5::float[], $6::float[], $7::float[], $8::int[], $9::text[],
        $10::int[], $11::date[], $12::text[], $13::text[], $14::text[], $15::boolean[], $16::text[], $17::text[], $18::text[], $19::text[]
      )
      ON CONFLICT(user_id, date) DO UPDATE SET
        present = CASE WHEN public."${payrollTableName}".updated = TRUE THEN public."${payrollTableName}".present ELSE EXCLUDED.present END,
        acompte = EXCLUDED.acompte,
        extra = EXCLUDED.extra,
        prime = EXCLUDED.prime,
        infraction = EXCLUDED.infraction,
        doublage = EXCLUDED.doublage,
        mise_a_pied = CASE WHEN public."${payrollTableName}".updated = TRUE THEN public."${payrollTableName}".mise_a_pied ELSE EXCLUDED.mise_a_pied END,
        retard = CASE WHEN public."${payrollTableName}".updated = TRUE THEN public."${payrollTableName}".retard ELSE EXCLUDED.retard END,
        remarque = CASE WHEN public."${payrollTableName}".updated = TRUE THEN public."${payrollTableName}".remarque ELSE EXCLUDED.remarque END,
        clock_in = CASE WHEN public."${payrollTableName}".updated = TRUE THEN public."${payrollTableName}".clock_in ELSE EXCLUDED.clock_in END,
        clock_out = CASE WHEN public."${payrollTableName}".updated = TRUE THEN public."${payrollTableName}".clock_out ELSE EXCLUDED.clock_out END,
        updated = CASE WHEN EXCLUDED.updated = TRUE THEN TRUE ELSE public."${payrollTableName}".updated END,
        p1_in = EXCLUDED.p1_in,
        p1_out = EXCLUDED.p1_out,
        p2_in = EXCLUDED.p2_in,
        p2_out = EXCLUDED.p2_out`,
      [
        val('finalPresent'), val('totalAdvance'), val('dayExtra'), val('dayPrime'), val('dayInfraction'), val('dayDoublage'), val('miseAPiedDays'), val('retardMins'), val('finalRemark'),
        val('userId'), val('dateSQL'), val('username'), val('clockIn'), val('clockOut'), val('forceUpdated'),
        val('coupureP1In'), val('coupureP1Out'), val('coupureP2In'), val('coupureP2Out')
      ]
    );
  }

  // flush accumulated notifications sorted by time ASC (so earliest gets lowest ID, latest gets highest ID)
  if (pendingNotifications.length > 0) {
    pendingNotifications.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const n of pendingNotifications) {
      await createNotification(n.type, n.title, n.message, n.userId, n.userDone, n.url, n.timestamp);
    }
  }

  invalidateCache();
}

/**
 * Automatically re-sync historical data for the current month when 
 * critical settings (is_coupure, schedule) are changed.
 */
async function syncUserMonthAutomatically(userId: string) {
  try {
    const now = getLogicalDate(new Date());
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const currentDay = now.getDate();

    // Sequential sync from start of month up to today
    for (let d = 1; d <= currentDay; d++) {
      const dStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      await recomputePayrollForDate(dStr, userId);
    }
  } catch (err) {
    console.error("Auto-sync error for user:", userId, err);
  }
}

// One-time migration to add clock_in and clock_out columns to all existing payroll tables
async function migrateAllPayrollTables() {
  try {
    // Get all tables that match the pattern paiecurrent_YYYY_MM
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'paiecurrent_%'
    `);

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      try {
        await pool.query(`ALTER TABLE public.\"${tableName}\" ADD COLUMN IF NOT EXISTS clock_in VARCHAR(50)`);
        await pool.query(`ALTER TABLE public.\"${tableName}\" ADD COLUMN IF NOT EXISTS clock_out VARCHAR(50)`);
        await pool.query(`ALTER TABLE public.\"${tableName}\" ADD COLUMN IF NOT EXISTS updated BOOLEAN DEFAULT FALSE`);
      } catch (err) {
        console.error(`Error migrating table ${tableName}:`, err);
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
}

// Run migration on startup
migrateAllPayrollTables().then(() => {
}).catch(err => {
  console.error("Migration failed:", err);
});

const resolvers = {
  Query: {
    getUserSchedule: async (_: any, { userId }: { userId: string }) => {
      const res = await pool.query('SELECT * FROM public.user_schedules WHERE user_id = $1', [userId]);
      if (res.rows.length === 0) return null;
      return res.rows[0];
    },
    getUsers: async () => {
      const res = await pool.query('SELECT id, username, role, status, zktime_id, "département" as departement, email, phone, cin, base_salary, photo, is_blocked, permissions, nbmonth FROM public.users ORDER BY id ASC');
      return res.rows.map((u: any) => ({
        ...u,
        base_salary: parseFloat(u.base_salary || 0)
      }));
    },
    getAllSchedules: async () => {
      const res = await pool.query(`
        SELECT u.id as user_id, u.username, u."département" as departement, u.photo,
               s.dim, s.lun, s.mar, s.mer, s.jeu, s.ven, s.sam
        FROM public.users u
        LEFT JOIN public.user_schedules s ON u.id = s.user_id
        WHERE u.is_blocked = FALSE
        ORDER BY u."département" ASC, u.username ASC
      `);
      return res.rows;
    },
    getUser: async (_: any, { id }: { id: string }) => {
      const res = await pool.query(`
        SELECT u.id, u.username, u.role, u.status, u.zktime_id, u."département" as departement, u.email, u.phone, u.cin, u.base_salary, u.photo, u.is_blocked, u.permissions, u.nbmonth, s.is_coupure
        FROM public.users u
        LEFT JOIN public.user_schedules s ON u.id = s.user_id
        WHERE u.id = $1
      `, [id]);
      const row = res.rows[0];
      if (!row) return null;
      return {
        ...row,
        base_salary: parseFloat(row.base_salary || 0),
        is_blocked: !!row.is_blocked,
        permissions: typeof row.permissions === 'object' ? JSON.stringify(row.permissions) : row.permissions
      };
    },
    getLogins: async () => {
      // 1. Get everyone from logins
      const loginsRes = await pool.query(`
        SELECT l.id as login_id, l.username, l.role, l.permissions, u.id as user_id, u.photo, u."département" as departement
        FROM public.logins l
        LEFT JOIN public.users u ON l.username = u.username
      `);

      // 2. Get everyone from users who is manager/admin but might not be in logins
      const usersRes = await pool.query(`
        SELECT u.id as user_id, u.username, u.role, u.photo, u."département" as departement, u.permissions
        FROM public.users u
        WHERE u.role IN ('manager', 'admin')
      `);

      const consolidated: any[] = [];
      const seenUsernames = new Set();

      // Prioritize logins
      loginsRes.rows.forEach((r: any) => {
        consolidated.push({
          id: `login-${r.login_id}`,
          username: r.username,
          role: r.role,
          permissions: typeof r.permissions === 'object' ? JSON.stringify(r.permissions) : r.permissions,
          photo: r.photo,
          departement: r.departement,
          status: 'Active'
        });
        seenUsernames.add(r.username);
      });

      // Add users who don't have a login yet
      usersRes.rows.forEach((r: any) => {
        if (!seenUsernames.has(r.username)) {
          consolidated.push({
            id: `user-${r.user_id}`,
            username: r.username,
            role: r.role,
            permissions: typeof r.permissions === 'object' ? JSON.stringify(r.permissions) : r.permissions,
            photo: r.photo,
            departement: r.departement,
            status: 'Active'
          });
        }
      });

      return consolidated;
    },
    getCinCard: async (_: any, { userId }: { userId: string }) => {
      const res = await pool.query(`
        SELECT id, user_id, cin_photo_front, cin_photo_back, uploaded_at
        FROM public.cardcin
        WHERE user_id = $1
      `, [userId]);
      return res.rows[0] || null;
    },
    getUserPhoto: async (_: any, { userId }: { userId: string }) => {
      const res = await pool.query('SELECT id, photo FROM public.users WHERE id = $1', [userId]);
      return res.rows[0];
    },
    getAdvances: async (_: any, { filter, month }: { filter?: string, month?: string }) => {
      const cacheKey = `getAdvances:${filter || 'all'}:${month || 'all'}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      let q = 'SELECT * FROM public.avances';
      const conditions = [];
      const params = [];

      if (filter) {
        conditions.push(`statut = $${params.length + 1} `);
        params.push(filter);
      }

      if (month && month.includes('_')) {
        const [year, monthNum] = month.split('_');
        const start = `${year}-${monthNum}-01`;
        const end = formatDateLocal(new Date(parseInt(year, 10), parseInt(monthNum, 10), 1));
        conditions.push(`date >= $${params.length + 1} AND date < $${params.length + 2}`);
        params.push(start, end);
      } else if (month) {
        conditions.push(`month = $${params.length + 1} `);
        params.push(month);
      }

      if (conditions.length > 0) {
        q += ' WHERE ' + conditions.join(' AND ');
      }

      q += ' ORDER BY date DESC';
      const res = await pool.query(q, params);
      const results = res.rows.map((r: any) => ({
        ...r,
        montant: parseFloat(r.montant || 0),
        // Use local format to avoid UTC shift
        date: formatDateLocal(r.date)
      }));

      setCache(cacheKey, results, 60000); // 1 minute cache



      return results;
    },
    getRetards: async (_: any, { date, startDate, endDate }: { date?: string, startDate?: string, endDate?: string }) => {
      let q = 'SELECT * FROM public.retards';
      const params: any[] = [];

      if (date) {
        q += ' WHERE date::date = $1::date';
        params.push(date);
      } else if (startDate && endDate) {
        q += ' WHERE date::date BETWEEN $1::date AND $2::date';
        params.push(startDate, endDate);
      }

      q += ' ORDER BY date DESC';
      const res = await pool.query(q, params);
      return res.rows.map((r: any) => ({
        ...r,
        date: formatDateTimeLocal(r.date)
      }));
    },
    getAbsents: async (_: any, { date, startDate, endDate }: { date?: string, startDate?: string, endDate?: string }) => {
      let q = 'SELECT * FROM public.absents';
      const params: any[] = [];

      if (date) {
        q += ' WHERE date::date = $1::date';
        params.push(date);
      } else if (startDate && endDate) {
        q += ' WHERE date::date BETWEEN $1::date AND $2::date';
        params.push(startDate, endDate);
      }

      q += ' ORDER BY date DESC';
      const res = await pool.query(q, params);
      return res.rows.map((r: any) => ({
        ...r,
        date: formatDateTimeLocal(r.date)
      }));
    },
    getNotifications: async (_: any, { userId, limit }: { userId?: string, limit?: number }) => {
      try {
        await ensureNotificationsTable();
        let q = 'SELECT id, type, title, message, timestamp, read, user_id, user_done as "userDone", url FROM public.notifications';
        const params = [];
        if (userId) {
          q += ' WHERE user_id = $1 OR user_id IS NULL';
          params.push(userId);
        }
        q += ' ORDER BY id DESC';
        if (limit) {
          q += ` LIMIT ${limit}`;
        } else {
          q += ` LIMIT 50`;
        }
        const res = await pool.query(q, params);
        return res.rows.map((r: any) => {
          let url = r.url;
          // Robust Fallback for old notifications
          if (!url) {
            if (r.type === 'pointage') url = `/attendance?userId=${r.user_id || ''}`;
            else if (r.type === 'system' || r.type === 'schedule') url = `/employees?userId=${r.user_id || ''}`;
            else if (r.type === 'avance') url = `/advances?userId=${r.user_id || ''}`;
            else if (r.type === 'payment') url = `/payroll`;
            else url = '/';
          }

          let finalIso = null;
          if (r.timestamp) {
            const d = new Date(r.timestamp);
            const pad = (n: number) => String(n).padStart(2, '0');
            // Force interpretation as Tunis Time (+01:00)
            // We use getHours() etc from the server-parsed date which represents the 'face value' of the DB timestamp
            const Y = d.getFullYear();
            const M = pad(d.getMonth() + 1);
            const D = pad(d.getDate());
            const h = pad(d.getHours());
            const m = pad(d.getMinutes());
            const s = pad(d.getSeconds());
            finalIso = `${Y}-${M}-${D}T${h}:${m}:${s}.000+01:00`;
          }

          return {
            ...r,
            timestamp: finalIso,
            url
          };
        });
      } catch (e) {
        console.error("Error fetching notifications:", e);
        return [];
      }
    },
    getExtras: async (_: any, { month, startDate, endDate }: { month?: string, startDate?: string, endDate?: string }) => {
      let q = 'SELECT * FROM public.extras';
      const params: any[] = [];

      if (startDate && endDate) {
        q += ' WHERE date_extra::date >= $1::date AND date_extra::date <= $2::date';
        params.push(startDate, endDate);
      } else if (month) {
        const [year, monthNum] = month.split('_');
        const start = `${year}-${monthNum}-01`;
        const end = formatDateLocal(new Date(parseInt(year, 10), parseInt(monthNum, 10), 1));
        q += " WHERE date_extra >= $1 AND date_extra < $2";
        params.push(start, end);
      }

      q += ' ORDER BY date_extra DESC';
      const res = await pool.query(q, params);
      return res.rows.map((r: any) => ({
        ...r,
        montant: parseFloat(r.montant || 0),
        date_extra: formatDateTimeLocal(r.date_extra)
      }));
    },
    getDoublages: async (_: any, { month, startDate, endDate }: any) => {
      let q = 'SELECT * FROM public.doublages WHERE 1=1';
      const params = [];
      if (month) {
        const [year, monthNum] = month.split('_');
        const start = `${year}-${monthNum}-01`;
        const end = formatDateLocal(new Date(parseInt(year, 10), parseInt(monthNum, 10), 1));
        q += ` AND date >= $${params.length + 1} AND date < $${params.length + 2}`;
        params.push(start, end);
      }
      if (startDate) {
        q += ` AND date >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        q += ` AND date <= $${params.length + 1}`;
        params.push(endDate);
      }
      q += ' ORDER BY date DESC';
      const res = await pool.query(q, params);
      return res.rows.map((r: any) => ({
        ...r,
        montant: parseFloat(r.montant || 0),
        date: formatDateTimeLocal(r.date)
      }));
    },
    login: async (_: any, { username, password }: any) => {
      try {
        const res = await pool.query("SELECT * FROM logins WHERE username = $1 AND password = $2", [username, password]);
        if (res.rows.length > 0) {
          const user = res.rows[0];
          return {
            success: true,
            message: "Login successful",
            user: {
              id: user.id,
              name: user.username,
              username: user.username,
              role: user.role,
              email: `${user.username}@businessbey.com`, // mock email
              status: 'Active',
              permissions: typeof user.permissions === 'object' ? JSON.stringify(user.permissions) : user.permissions
            },
            token: "mock-token-123"
          }
        } else {
          return { success: false, message: "Invalid credentials", user: null, token: null }
        }
      } catch (e) {
        console.error(e);
        return { success: false, message: "Server error", user: null, token: null }
      }
    },
    getPayroll: async (_: any, { month, userId }: { month: string, userId?: string }) => {
      const cacheKey = `getPayroll:${month}:${userId || 'all'}`;
      // const cached = getCached(cacheKey);
      // if (cached) return cached;

      await initializePayrollTable(month);
      const tableName = `paiecurrent_${month}`;
      try {
        let q = `SELECT * FROM public."${tableName}"`;
        const params = [];
        if (userId) {
          q += ` WHERE user_id = $1`;
          params.push(userId);
        }
        q += ` ORDER BY date ASC`;
        const res = await pool.query(q, params);

        // Fetch real-time Advances and Extras to overlay
        const [year, monthNum] = month.split('_');
        const start = `${year}-${monthNum}-01`;
        const endDay = new Date(parseInt(year), parseInt(monthNum), 1);
        const end = endDay.toISOString().split('T')[0];

        const [resAdvances, resExtras, resAbsents, resRetards, resDoublages] = await Promise.all([
          pool.query(`SELECT * FROM public.avances WHERE date >= $1 AND date < $2 ${userId ? `AND user_id = $3` : ''}`, userId ? [start, end, userId] : [start, end]),
          pool.query(`SELECT * FROM public.extras WHERE date_extra >= $1 AND date_extra < $2 ${userId ? `AND user_id = $3` : ''}`, userId ? [start, end, userId] : [start, end]),
          pool.query(`SELECT * FROM public.absents WHERE date >= $1 AND date < $2 ${userId ? `AND user_id = $3` : ''}`, userId ? [start, end, userId] : [start, end]),
          pool.query(`SELECT * FROM public.retards WHERE date >= $1 AND date < $2 ${userId ? `AND user_id = $3` : ''}`, userId ? [start, end, userId] : [start, end]),
          pool.query(`SELECT * FROM public.doublages WHERE date >= $1 AND date < $2 ${userId ? `AND user_id = $3` : ''}`, userId ? [start, end, userId] : [start, end])
        ]);

        const advances = resAdvances.rows;
        const extras = resExtras.rows;
        const absents = resAbsents.rows;
        const retards = resRetards.rows;
        const doublages = resDoublages.rows;

        // Pre-group data by userId_date for O(1) lookup
        const advancesMap = new Map<string, any[]>();
        advances.forEach((a: any) => {
          const key = `${a.user_id}_${formatDateLocal(a.date)}`;
          if (!advancesMap.has(key)) advancesMap.set(key, []);
          advancesMap.get(key)!.push(a);
        });

        const extrasMap = new Map<string, any[]>();
        extras.forEach((e: any) => {
          const key = `${e.user_id}_${formatDateLocal(e.date_extra)}`;
          if (!extrasMap.has(key)) extrasMap.set(key, []);
          extrasMap.get(key)!.push(e);
        });

        const absentsMap = new Map<string, any>();
        absents.forEach((a: any) => {
          const key = `${a.user_id}_${formatDateLocal(a.date)}`;
          absentsMap.set(key, a);
        });

        const retardsMap = new Map<string, any>();
        retards.forEach((r: any) => {
          const key = `${r.user_id}_${formatDateLocal(r.date)}`;
          retardsMap.set(key, r);
        });

        const doublagesMap = new Map<string, any[]>();
        doublages.forEach((d: any) => {
          const key = `${d.user_id}_${formatDateLocal(d.date)}`;
          if (!doublagesMap.has(key)) doublagesMap.set(key, []);
          doublagesMap.get(key)!.push(d);
        });

        const results = res.rows.map((r: any) => {
          const dateStr = formatDateLocal(r.date);
          const lookupKey = `${r.user_id}_${dateStr}`;

          // Calculate dynamic totals using pre-grouped maps
          const dayAdvances = advancesMap.get(lookupKey) || [];
          const totalAdvance = dayAdvances.reduce((sum: number, a: any) => sum + parseFloat(a.montant || 0), 0);

          const dayExtras = extrasMap.get(lookupKey) || [];
          let totalExtra = 0;
          let totalPrime = 0;
          let totalInfractionExtra = 0;

          dayExtras.forEach((e: any) => {
            const motif = (e.motif || "").toLowerCase();
            if (motif.startsWith("prime")) totalPrime += parseFloat(e.montant || 0);
            else if (motif.startsWith("infraction")) totalInfractionExtra += parseFloat(e.montant || 0);
            else totalExtra += parseFloat(e.montant || 0);
          });

          const dayDoublages = doublagesMap.get(lookupKey) || [];
          const totalDoublage = dayDoublages.reduce((sum: number, d: any) => sum + parseFloat(d.montant || 0), 0);

          // Build final values - prioritize manual updates
          let finalPresent = r.present;
          let finalRemark = r.remarque;
          let finalRetard = r.retard;
          let finalInfraction = r.infraction || 0;
          let finalMiseAPied = r.mise_a_pied || 0;

          if (!r.updated) {
            // Real-time Absence/Retard overlay - only for auto records
            const dayAbsent = absentsMap.get(lookupKey);
            const dayRetard = retardsMap.get(lookupKey);

            if (dayAbsent) {
              const t = (dayAbsent.type || "").toLowerCase().trim();
              const isPresentType = t === "présent" || t === "present" || t === "justifié" || t === "justifie";
              const isAbsentType = ['absence', 'absent', 'injustifié', 'injustifie', 'non justifié', 'non justifie', 'mise à pied', 'mise a pied', 'injustice'].includes(t);

              if (dayAbsent.reason === "Pointage de sortie manquant") {
                finalPresent = 0;
                finalRemark = "Pointage de sortie manquant";
              } else if (isPresentType) {
                finalPresent = 1;
                finalRemark = dayAbsent.reason || "Présent";
              } else if (isAbsentType) {
                finalPresent = 0;
                finalRemark = dayAbsent.reason || "ABSENT";
              } else {
                finalPresent = r.present;
                finalRemark = dayAbsent.reason || r.remarque;
              }
            } else if (dayRetard) {
              const m = dayRetard.reason || "";
              if (m.includes("h")) {
                const hMatch = m.match(/(\d+)h/);
                const minMatch = m.match(/(\d+)m/);
                const h = hMatch ? parseInt(hMatch[1]) : 0;
                const mins = minMatch ? parseInt(minMatch[1]) : 0;
                finalRetard = h * 60 + mins;
              } else {
                const match = m.match(/(\d+)/);
                finalRetard = match ? parseInt(match[1]) : r.retard;
              }
              finalRemark = dayRetard.reason;
              if (finalRetard > 10 && finalInfraction < 30) finalInfraction += 30;
            } else if (r.present === 1 && !r.remarque) {
              finalRemark = null;
            }

            // Mise à pied overlay
            if (dayAbsent && dayAbsent.type === 'Mise à pied') {
              const match = dayAbsent.reason?.match(/(\d+(\.\d+)?)\s*jour/i);
              finalMiseAPied = match ? parseFloat(match[1]) : 1;
            }

            // Append Extras/Primes to remark for auto records only
            let remarkParts: string[] = [];
            if (finalRemark) {
              remarkParts = finalRemark.split(' | ').map((s: string) => s.trim()).filter(Boolean);
            }
            if (dayExtras.length > 0) {
              dayExtras.forEach((e: any) => {
                if (e.motif) {
                  const motif = e.motif.trim();
                  if (!remarkParts.includes(motif)) remarkParts.push(motif);
                }
              });
            }
            finalRemark = remarkParts.length > 0 ? remarkParts.join(' | ') : null;
          }

          return {
            ...r,
            date: dateStr,
            acompte: totalAdvance || r.acompte || 0,
            extra: totalExtra || r.extra || 0,
            prime: totalPrime || r.prime || 0,
            doublage: totalDoublage || r.doublage || 0,
            infraction: Math.max(r.infraction || 0, totalInfractionExtra),
            mise_a_pied: finalMiseAPied,
            present: finalPresent,
            remarque: finalRemark,
            retard: finalRetard
          };
        });

        setCache(cacheKey, results, 60000); // 1 minute cache
        return results;
      } catch (e) {
        console.error("getPayroll error:", e);
        return [];
      }
    },
    getTopPerformers: async (_: any, { month }: { month: string }) => {
      await initializePayrollTable(month);
      const tableName = `paiecurrent_${month}`;
      try {
        const payrollRes = await pool.query(`SELECT * FROM public.\"${tableName}\"`);
        const payroll = payrollRes.rows;

        const usersRes = await pool.query('SELECT id, username, photo, \"département\" as departement FROM public.users WHERE role != \'admin\' AND is_blocked = FALSE');
        const users = usersRes.rows;

        const statsMap = new Map<string, { totalMins: number, daysWorked: number, totalRetard: number, onTimeDays: number, totalInfractions: number }>();

        payroll.forEach((row: any) => {
          const presentVal = parseFloat(row.present || 0);
          if (presentVal <= 0) return;
          const uid = String(row.user_id);
          if (!statsMap.has(uid)) {
            statsMap.set(uid, { totalMins: 0, daysWorked: 0, totalRetard: 0, onTimeDays: 0, totalInfractions: 0 });
          }
          const stats = statsMap.get(uid)!;
          stats.daysWorked += presentVal;
          stats.totalRetard += (row.retard || 0);
          stats.totalInfractions += (row.infraction || 0);

          // Disciplined day: 0 retard AND 0 infraction -> proportional onTimeDays
          if ((row.retard || 0) === 0 && (row.infraction || 0) === 0) {
            stats.onTimeDays += presentVal;
          }

          if (row.clock_in && row.clock_out) {
            try {
              const [h1, m1] = row.clock_in.split(':').map(Number);
              const [h2, m2] = row.clock_out.split(':').map(Number);
              if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
                let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (diff < 0) diff += 24 * 60; // Over midnight
                stats.totalMins += diff;
              }
            } catch (e) { }
          }
        });

        const results = users.map((user: any) => {
          const stats = statsMap.get(String(user.id)) || { totalMins: 0, daysWorked: 0, totalRetard: 0, onTimeDays: 0, totalInfractions: 0 };
          const totalHours = parseFloat((stats.totalMins / 60).toFixed(1));
          const avg = stats.daysWorked > 0 ? parseFloat((totalHours / stats.daysWorked).toFixed(1)) : 0;

          // Performance Score: heavy weight on onTimeDays, extreme deduction for infractions and totalRetard
          const punctualityScore = (stats.onTimeDays * 500) + (stats.daysWorked * 10) - (stats.totalRetard * 2) - (stats.totalInfractions * 50) + (totalHours);

          return {
            user: { ...user, departement: user.departement },
            totalHours,
            daysWorked: stats.daysWorked,
            avgHoursPerDay: avg,
            totalRetard: stats.totalRetard,
            onTimeDays: stats.onTimeDays,
            punctualityScore
          };
        })
          .filter((r: any) => r.daysWorked > 0)
          .sort((a: any, b: any) => b.punctualityScore - a.punctualityScore)
          .slice(0, 5);

        return results;
      } catch (e) {
        console.error("getTopPerformers error:", e);
        return [];
      }
    },

    userAttendanceHistory: async (_: any, { userId, startDate, endDate }: any) => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      const promises = dates.map(async (d) => {
        const dateStr = d.toISOString().split('T')[0];

        // Fetch punches for this logical day
        const dayPunches = await fetchDayPunches(d, userId);
        dayPunches.sort((a: any, b: any) => new Date(a.device_time).getTime() - new Date(b.device_time).getTime());

        // FILTER: Remove punches that belong to "Next Day Start" (Day X+1 >= 06:00)
        let filteredPunches = dayPunches;
        if (dayPunches.length > 0) {
          const firstP = dayPunches[0];
          const firstD = new Date(firstP.device_time);

          const isNextDay = firstD.getDate() !== d.getDate();
          if (isNextDay && firstD.getHours() >= 6) {
            filteredPunches = [];
          }
        }

        if (filteredPunches.length > 0) {
          const firstP = filteredPunches[0];
          const firstDate = new Date(firstP.device_time);
          const isNextDay = firstDate.getDate() !== d.getDate();

          let clockIn = null;
          let clockOut = null;
          let shift = "Indéfini";
          let hours = 0;

          if (isNextDay) {
            // Late Exit case (e.g. 02:00 AM on Day X+1)
            clockIn = null;
            const lastP = filteredPunches[filteredPunches.length - 1];
            clockOut = formatTime(lastP.device_time);
            shift = "Soir";
            hours = 0; // Cannot calculate duration without entry
          } else {
            // Standard Entry (Day X)
            clockIn = formatTime(firstP.device_time);
            const lastDate = filteredPunches.length > 1 ? new Date(filteredPunches[filteredPunches.length - 1].device_time) : null;

            if (filteredPunches.length > 1) {
              clockOut = formatTime(filteredPunches[filteredPunches.length - 1].device_time);
              if (lastDate) {
                const durationMs = lastDate.getTime() - firstDate.getTime();
                hours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(1));
              }
            }

            const isOngoing = filteredPunches.length % 2 !== 0;
            shift = determineShift(firstDate, lastDate, isOngoing);
          }

          return {
            date: dateStr,
            clockIn,
            clockOut,
            raw_punches: filteredPunches.map((p: any) => formatTime(p.device_time)),
            shift,
            hours
          };
        } else {
          return { date: dateStr, clockIn: null, clockOut: null, raw_punches: [], shift: null, hours: 0 };
        }
      });

      const results = await Promise.all(promises);
      return results;
    },
    personnelStatus: async (_: any, { filter, date }: { filter?: string, date?: string }) => {
      // Use midpoint to avoid TZ shifts
      const targetDate = date ? new Date(date + 'T12:00:00') : new Date();
      const logicalDay = getLogicalDate(targetDate);
      const dateSQL = formatDateLocal(logicalDay);
      if (!dateSQL) return [];

      // Check cache first (30 second TTL for today, 5 minutes for past dates)
      const isToday = dateSQL === formatDateLocal(getLogicalDate(new Date()));
      const cacheKey = `personnelStatus:${dateSQL}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return cached;
      }
      const dayOfWeekIndex = logicalDay.getDay();
      const dayCols = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
      const dayCol = dayCols[dayOfWeekIndex];

      const monthKey = dateSQL.substring(0, 7).replace('-', '_');
      const payrollTableName = `paiecurrent_${monthKey}`;
      await Promise.all([
        initializePayrollTable(monthKey),
        ensureStaticIndexes(),
        ensureNotificationsTable()
      ]);

      // Parallelize Fetching with optimized index-friendly queries
      const nextDateSQL = formatDateLocal(new Date(logicalDay.getTime() + 86400000));
      const [usersRes, schedulesRes, allPunches, retardsRes, absentsRes, payrollRes, monthAbsentsRes, monthRetardsRes] = await Promise.all([
        pool.query(`
          SELECT id, username, role, status, zktime_id, "département" as departement, email, phone, cin, base_salary, photo, is_blocked, permissions, nbmonth, is_coupure, is_fixed
          FROM public.users 
          ORDER BY id ASC
        `),
        pool.query('SELECT * FROM public.user_schedules'),
        fetchDayPunches(logicalDay),
        pool.query('SELECT user_id, reason FROM public.retards WHERE date >= $1 AND date < $2', [dateSQL, nextDateSQL]),
        pool.query('SELECT user_id, reason, type FROM public.absents WHERE date >= $1 AND date < $2', [dateSQL, nextDateSQL]),
        pool.query(`SELECT * FROM public."${payrollTableName}" WHERE date = $1`, [dateSQL]),
        pool.query(`SELECT user_id, COUNT(*) as count FROM public.absents WHERE date >= '${dateSQL.substring(0, 7)}-01' AND date <= '${dateSQL}' AND (user_id, date) NOT IN (SELECT user_id, date FROM public.retards WHERE date >= '${dateSQL.substring(0, 7)}-01' AND date <= '${dateSQL}') GROUP BY user_id`),
        pool.query(`SELECT user_id, COUNT(*) as count FROM public.retards WHERE date >= '${dateSQL.substring(0, 7)}-01' AND date <= '${dateSQL}' GROUP BY user_id`)
      ]);

      const users = usersRes.rows.map((u: any) => ({
        ...u,
        base_salary: parseFloat(u.base_salary || 0),
        is_blocked: !!u.is_blocked,
        permissions: typeof u.permissions === 'object' ? JSON.stringify(u.permissions) : u.permissions
      }));

      const schedulesMap = new Map<number, any>();
      schedulesRes.rows.forEach((s: any) => schedulesMap.set(Number(s.user_id), s));

      const retardsMap = new Map<number, any>();
      retardsRes.rows.forEach((r: any) => retardsMap.set(Number(r.user_id), r));

      const absentsMap = new Map<number, any[]>();
      absentsRes.rows.forEach((a: any) => {
        const uid = Number(a.user_id);
        if (!absentsMap.has(uid)) absentsMap.set(uid, []);
        absentsMap.get(uid)!.push(a);
      });

      // Use dayPayrollMap as expected by downstream logic
      const dayPayrollMap = new Map<number, any>();
      payrollRes.rows.forEach((p: any) => dayPayrollMap.set(Number(p.user_id), p));

      const monthAbsentsMap = new Map<number, number>();
      monthAbsentsRes.rows.forEach((r: any) => monthAbsentsMap.set(Number(r.user_id), parseInt(r.count)));

      const monthRetardsMap = new Map<number, number>();
      monthRetardsRes.rows.forEach((r: any) => monthRetardsMap.set(Number(r.user_id), parseInt(r.count)));

      const punchesByUser = new Map<number, any[]>();
      allPunches.forEach((p: any) => {
        const uid = Number(p.user_id);
        if (!punchesByUser.has(uid)) punchesByUser.set(uid, []);
        punchesByUser.get(uid)!.push(p);
      });

      const results = users.map((user: any) => {
        const uId = Number(user.id);
        const schedule = schedulesMap.get(uId);
        const originalShiftType = schedule ? schedule[dayCol] : "Repos";
        let shiftType = originalShiftType;

        let userPunches = punchesByUser.get(Number(user.id)) || [];
        userPunches.sort((a: any, b: any) => new Date(a.device_time).getTime() - new Date(b.device_time).getTime());

        let clockIn = null;
        let clockOut = null;
        let shift = (shiftType === "Repos") ? null : shiftType;

        if (userPunches.length > 0) {
          // Override Repos for calculation
          if (shiftType === "Repos") shiftType = "Matin";
          const firstDate = parseMachineDate(userPunches[0].device_time);
          clockIn = formatTime(userPunches[0].device_time);

          if (userPunches.length > 1) {
            clockOut = formatTime(userPunches[userPunches.length - 1].clock_out || userPunches[userPunches.length - 1].device_time);
          }
          const lastDate = userPunches.length > 1 ? parseMachineDate(userPunches[userPunches.length - 1].device_time) : null;
          const isOngoing = userPunches.length % 2 !== 0;
          shift = determineShift(firstDate, lastDate, isOngoing);

          // Update shiftType but prioritize the PLANNED shift if available.
          // This ensures that if they are planned "Soir" but arrive early (11am), we still use 16:00 as start time (so no retard).
          if (shift && shift !== "Non défini") {
            const detectedShift = shift;
            const hasPlannedShift = originalShiftType && originalShiftType !== "Repos";

            if (!hasPlannedShift) {
              shiftType = detectedShift;
            } else {
              // Base Priority: Schedule first
              shift = originalShiftType;
              shiftType = originalShiftType;

              // EXCEPTION: If scheduled "Soir" but detected "Doublage" with a true Morning start
              // (e.g. Ghassen starts 07:49 -> Doublage, Nejah starts 11:18 -> Soir)
              if (originalShiftType === "Soir" && detectedShift === "Doublage") {
                const startH = getTunisiaHour(firstDate);
                // Threshold: 11:00 AM. If started before this, it's a true Doublage/Morning start
                if (startH < 11) {
                  shift = "Doublage";
                  shiftType = "Doublage"; // Also update logic to check retard against 07:00, not 16:00
                }
              }
            }
          }
        }

        // Determine State for Dashboard
        let state = 'Absent';
        const hasPunches = userPunches.length > 0;

        // Check manual overrides in Absents table
        const userAbsents = absentsMap.get(uId) || [];
        const currentRetardRecord = retardsMap.get(uId);

        // Live Retard Detection
        const sTypeUpper = (shiftType || "").toUpperCase();
        let liveDelay = null;
        let isLiveRetard = false;
        if (hasPunches && sTypeUpper !== "REPOS") {
          let startHour = (sTypeUpper === "SOIR") ? 16 : 7;

          const shiftStartTime = new Date(`${dateSQL}T${String(startHour).padStart(2, "0")}:00:00.000+01:00`);
          const firstD = parseMachineDate(userPunches[0].device_time);
          if (firstD > shiftStartTime) {
            const diffMins = Math.floor((firstD.getTime() - shiftStartTime.getTime()) / 60000);
            if (diffMins > 0) {
              isLiveRetard = true;
              liveDelay = formatDuration(diffMins);
            }
          }
        }

        // CORRECTION: Even if DB has a retard (from faulty earlier logic), re-verify if it is VALID under new rules
        // If we have punches, and the shift is Soir (16:00), and entry is 11:18, it shouldn't be retard.
        let validRetard = isLiveRetard;

        // If DB says retard but live calculation (with corrected shiftType) says NO retard, we trust the corrected logic
        // EXCEPT if the DB retard is a manual override (which we can't easily distinguish from auto, but usually auto matches format)
        if (currentRetardRecord) {
          // Re-check detection with the SAFE shiftType
          if (hasPunches && sTypeUpper === "SOIR" && clockIn) {
            // If shift is Soir, and we have punches, verify start time
            const startHour = 16;
            const shiftStartTime = new Date(`${dateSQL}T${String(startHour).padStart(2, "0")}:00:00.000+01:00`);
            const firstD = parseMachineDate(userPunches[0].device_time);

            if (firstD <= shiftStartTime) {
              // He arrived BEFORE start time. This DB retard is INVALID (legacy from bug).
              validRetard = false;
            } else {
              validRetard = true;
            }
          } else {
            // Trust DB for other cases (or if it's manual)
            validRetard = true;
          }
        }

        const isRetard = validRetard;
        // If we invalidated the retard, clear the delay string
        let delay = isRetard ? (currentRetardRecord?.reason || liveDelay) : null;
        let currentInfraction = 0;

        // Calculate live infraction if it's a retard
        if (isRetard && delay) {
          let mins = 0;
          if (delay.includes("h")) {
            const hMatch = delay.match(/(\d+)h/);
            const minMatch = delay.match(/(\d+)m/);
            const h = hMatch ? parseInt(hMatch[1]) : 0;
            const ms = minMatch ? parseInt(minMatch[1]) : 0;
            mins = h * 60 + ms;
          } else {
            const m = delay.match(/(\d+)/);
            if (m) mins = parseInt(m[1]);
          }
          if (mins > 10) currentInfraction = 30;
        }

        const isManualPresent = userAbsents.some((a: any) => {
          const t = (a.type || "").toLowerCase().trim();
          return t === "présent" || t === "present" || t === "justifié" || t === "justifie";
        });
        const isManualAbsent = userAbsents.length > 0 && !isManualPresent;


        // Check if we're querying for today and if it's too early to mark as absent
        const todayNow = new Date();
        const currentLogicalDate = getLogicalDate(todayNow);
        const isToday = formatDateLocal(logicalDay) === formatDateLocal(currentLogicalDate);

        // TZ: Use Tunisia hour/min instead of server-local (Vercel=UTC vs Local=Tunis)
        const currentHourReal = getTunisiaHour(todayNow);
        const currentMin = getTunisiaMinute(todayNow);

        // Adjust hour for logical day tail (00:00 - 04:00)
        const adjustedHour = (currentHourReal < 4) ? currentHourReal + 24 : currentHourReal;
        const currentTotalMins = adjustedHour * 60 + currentMin;

        // Intelligent Absence detection: if it's past shift start + grace period, show as Absent
        let isOverdue = false;
        if (sTypeUpper === "MATIN" || sTypeUpper === "DOUBLAGE") {
          // Matin starts at 07:00. Overdue by 07:15 (15 min grace)
          if (currentTotalMins > (7 * 60 + 15)) isOverdue = true;
        } else if (sTypeUpper === "SOIR") {
          // Soir starts at 16:00. Overdue by 16:15
          if (currentTotalMins > (16 * 60 + 15)) isOverdue = true;
        }

        const shiftEndLimit = (sTypeUpper === "SOIR") ? 23 : 16;
        const isTooEarlyToMarkAbsent = isToday && !isOverdue && adjustedHour < shiftEndLimit;

        // PRIORITY: Actual fingerprint punches override everything
        if (hasPunches) {
          // Check for Missing Exit on past days
          const isPastDayStatus = logicalDay.getTime() < currentLogicalDate.getTime();

          // Only mark as Missing_Exit if:
          // 1. It's a past day
          // 2. They have a clock IN (started work)
          // 3. They don't have a clock OUT (didn't finish)
          if (isPastDayStatus && clockIn && !clockOut) {
            state = 'Missing_Exit';
          } else {
            state = isRetard ? 'Retard' : 'Présent';
          }
        } else if (isManualPresent) {
          state = isRetard ? 'Retard' : 'Présent';
        } else if (isManualAbsent) {
          state = 'Absent';
        } else if (shiftType === "Repos") {
          state = 'Repos';
        } else if (isTooEarlyToMarkAbsent || logicalDay.getTime() > currentLogicalDate.getTime()) {
          // Future work day or too early for today
          state = 'Non Connecté';
        } else {
          state = 'Absent';
        }

        // Split Shift detection for Chef_Cuisine display
        if (user.departement === 'Chef_Cuisine' && userPunches.length > 0) {
          const hasMatin = userPunches.some((p: any) => getTunisiaHour(new Date(p.device_time)) < 16);
          const hasSoir = userPunches.some((p: any) => getTunisiaHour(new Date(p.device_time)) >= 16);
          if (hasMatin && hasSoir) shift = "Coupure (Split)";
          else if (hasMatin) shift = "Coupure (Matin)";
          else if (hasSoir) shift = "Coupure (Soir)";
        }

        // PRIORITY: If manually updated in payroll, use those values
        const userPayroll = dayPayrollMap.get(uId);
        const isManuallyUpdated = userPayroll && userPayroll.updated === true;

        if (isManuallyUpdated) {
          clockIn = userPayroll.clock_in || clockIn;
          clockOut = userPayroll.clock_out || clockOut;

          if (userPayroll.present === 1) {
            // Check if it was explicitly marked as retard in payroll table
            // In paiecurrent, retard is an Int (minutes)
            state = (userPayroll.retard > 0) ? 'Retard' : 'Présent';
          } else {
            state = 'Absent';
          }
        }

        let workedHours = null;
        if (clockIn && clockOut) {
          try {
            const [h1, m1] = clockIn.split(':').map(Number);
            const [h2, m2] = clockOut.split(':').map(Number);
            let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diffMins < 0) diffMins += 24 * 60; // Handle overnight
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            workedHours = `${hours}h ${mins}m`;
          } catch (e) { }
        } else if (userPunches.length >= 2) {
          const start = new Date(userPunches[0].device_time).getTime();
          const end = new Date(userPunches[userPunches.length - 1].device_time).getTime();
          const diffMs = end - start;
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          workedHours = `${hours}h ${mins}m`;
        }

        return {
          user,
          attendance: userPunches[0] || null,
          clockIn,
          clockOut,
          state,
          shift,
          workedHours,
          delay,
          infraction: isManuallyUpdated ? parseFloat(userPayroll.infraction || 0) : Math.max(currentInfraction, (userPayroll ? parseFloat(userPayroll.infraction || 0) : 0)),
          remarque: userPayroll ? userPayroll.remarque : (isRetard ? delay : null),
          lastPunch: userPunches.length > 0 ? userPunches[userPunches.length - 1].device_time : null,
          is_blocked: !!user.is_blocked,
          schedule,
          absentDaysCount: monthAbsentsMap.get(uId) || 0,
          daysLateCount: monthRetardsMap.get(uId) || 0
        };
      });

      // Sorting: "always the last finger point is the first"
      results.sort((a: any, b: any) => {
        const timeA = a.lastPunch ? new Date(a.lastPunch).getTime() : 0;
        const timeB = b.lastPunch ? new Date(b.lastPunch).getTime() : 0;
        return timeB - timeA;
      });

      // Cache results (30s for today, 5 min for past dates)
      const cacheTTL = isToday ? 30000 : 300000;
      setCache(cacheKey, results, cacheTTL);

      return results;
    },
  },
  Mutation: {
    addUser: async (_: any, { input }: { input: any }, context: any) => {
      try {
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo TEXT');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nbmonth INT');
        await pool.query('ALTER TABLE public.users ALTER COLUMN nbmonth DROP NOT NULL');
        await pool.query('ALTER TABLE public.users ALTER COLUMN zktime_id DROP NOT NULL');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_coupure BOOLEAN DEFAULT false');
      } catch (e) { }

      const { username, email, phone, cin, departement, role, zktime_id, status, base_salary, photo, is_blocked, nbmonth, is_coupure, is_fixed } = input;
      const res = await pool.query(
        `INSERT INTO public.users(username, email, phone, cin, "département", role, zktime_id, status, base_salary, photo, is_blocked, nbmonth, is_coupure, is_fixed)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, username, email, phone, cin, "département" as departement, role, zktime_id, status, base_salary, photo, is_blocked, nbmonth, is_coupure, is_fixed`,
        [username, email, phone, cin, departement, role, zktime_id || null, status, base_salary, photo, is_blocked || false, nbmonth || null, is_coupure || false, is_fixed || false]
      );
      const newUser = res.rows[0];

      // Auto-sync for new user month
      await syncUserMonthAutomatically(newUser.id);

      await createNotification('system', "Action Administrative: Nouvel Employé", `L'employé ${newUser.username} a été ajouté au système.`, newUser.id, context.userDone, `/employees?userId=${newUser.id}`);
      return { ...newUser, is_blocked: !!newUser.is_blocked };
    },
    updateUser: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      try {
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo TEXT');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nbmonth INT');
        await pool.query('ALTER TABLE public.users ALTER COLUMN nbmonth DROP NOT NULL');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_coupure BOOLEAN DEFAULT false');
      } catch (e) { }

      const { username, email, phone, cin, departement, role, zktime_id, status, base_salary, photo, is_blocked, nbmonth, is_coupure, is_fixed } = input;
      const res = await pool.query(
        `UPDATE public.users
          SET username = $2, email = $3, phone = $4, cin = $5, "département" = $6, role = $7, zktime_id = $8, status = $9, base_salary = $10, photo = $11, is_blocked = $12, nbmonth = $13, is_coupure = $14, is_fixed = $15
          WHERE id = $1
          RETURNING id, username, email, phone, cin, "département" as departement, role, zktime_id, status, base_salary, photo, is_blocked, nbmonth, is_coupure, is_fixed`,
        [id, username, email, phone, cin, departement, role, zktime_id || null, status, base_salary, photo, is_blocked || false, nbmonth || null, is_coupure || false, is_fixed || false]
      );
      const updatedUser = res.rows[0];

      // Auto-sync if Mode Coupure changed
      await syncUserMonthAutomatically(id);

      await createNotification('system', "Action Administrative: Profil Mis à Jour", `Le profil de ${updatedUser.username} a été mis à jour par un administrateur.`, updatedUser.id, context.userDone, `/employees?userId=${updatedUser.id}`);
      return { ...updatedUser, is_blocked: !!updatedUser.is_blocked };
    },
    toggleUserBlock: async (_: any, { userId, isBlocked }: { userId: string, isBlocked: boolean }, context: any) => {
      const res = await pool.query(
        `UPDATE public.users SET is_blocked = $2 WHERE id = $1 RETURNING *`,
        [userId, isBlocked]
      );
      if (res.rows.length === 0) throw new Error("User not found");
      const user = res.rows[0];
      await createNotification('system', isBlocked ? "Employé Bloqué" : "Employé Débloqué", `L'employé ${user.username} a été ${isBlocked ? 'bloqué' : 'débloqué'}.`, user.id, context.userDone);
      return { ...user, is_blocked: !!user.is_blocked };
    },
    updateUserPermissions: async (_: any, { userId, permissions }: { userId: string, permissions: string }, context: any) => {
      try {
        await pool.query('ALTER TABLE public.logins ADD COLUMN IF NOT EXISTS permissions JSONB');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB');
      } catch (e) { }

      let dbId = userId;
      let isLoginId = userId.startsWith('login-');
      let isUserId = userId.startsWith('user-');

      if (isLoginId) dbId = userId.replace('login-', '');
      if (isUserId) dbId = userId.replace('user-', '');

      let row;
      if (isLoginId) {
        const res = await pool.query(`UPDATE public.logins SET permissions = $2 WHERE id = $1 RETURNING *`, [dbId, permissions]);
        if (res.rows.length === 0) throw new Error("Login account not found");
        row = res.rows[0];
        // Sync to users
        try { await pool.query('UPDATE public.users SET permissions = $2 WHERE username = $1', [row.username, permissions]); } catch (e) { }
      } else {
        // Assume user ID or 'user-' prefix
        const res = await pool.query(`UPDATE public.users SET permissions = $2 WHERE id = $1 RETURNING *`, [dbId, permissions]);
        if (res.rows.length === 0) throw new Error("User not found");
        row = res.rows[0];
        // Sync to logins
        try { await pool.query('UPDATE public.logins SET permissions = $2 WHERE username = $1', [row.username, permissions]); } catch (e) { }
      }

      await createNotification('system', "Permissions modifiées", `Les permissions de ${row.username} ont été mises à jour.`, dbId, context.userDone);

      return {
        ...row,
        permissions: typeof row.permissions === 'object' ? JSON.stringify(row.permissions) : row.permissions
      };
    },
    createLoginAccount: async (_: any, { username, password, role, permissions }: any, context: any) => {
      const res = await pool.query(
        `INSERT INTO public.logins(username, password, role, permissions) VALUES($1, $2, $3, $4) RETURNING *`,
        [username, password, role, permissions || null]
      );
      const row = res.rows[0];
      await createNotification('system', "Action Administrative: Accès Créé", `Un compte d'accès a été créé pour ${row.username} avec le rôle ${row.role}.`, null, context.userDone);
      return {
        ...row,
        permissions: typeof row.permissions === 'object' ? JSON.stringify(row.permissions) : row.permissions
      };
    },
    updateLoginAccount: async (_: any, { id, username, password, role, permissions }: any, context: any) => {
      const dbId = id.replace('login-', '').replace('user-', '');
      let loginId = dbId;
      let targetUsername = username;
      let targetRole = role;

      if (id.startsWith('user-')) {
        // It's a user ID without a login record yet.
        const userId = dbId;
        // Get username and role from users table
        const uRes = await pool.query('SELECT username, role FROM public.users WHERE id = $1', [userId]);
        if (uRes.rows.length === 0) throw new Error("User not found in personnel list");
        targetUsername = uRes.rows[0].username;
        targetRole = role || uRes.rows[0].role || 'manager'; // Use provided role, or user's role, or default to 'manager'

        // Check if a login record actually exists now (maybe created meanwhile)
        const lCheck = await pool.query('SELECT id FROM public.logins WHERE username = $1', [targetUsername]);
        if (lCheck.rows.length > 0) {
          loginId = lCheck.rows[0].id; // Use the existing login ID for update
        } else {
          // If it doesn't exist, we must INSERT it.
          // Note: password is required for insertion. If not provided, we need a default or error.
          if (!password) throw new Error("Un mot de passe est requis pour créer un nouvel accès.");
          const insRes = await pool.query(
            `INSERT INTO public.logins(username, password, role, permissions) VALUES($1, $2, $3, $4) RETURNING *`,
            [targetUsername, password, targetRole, permissions || null]
          );
          return {
            ...insRes.rows[0],
            permissions: typeof insRes.rows[0].permissions === 'object' ? JSON.stringify(insRes.rows[0].permissions) : insRes.rows[0].permissions
          };
        }
      }

      // Standard Update
      const updates = [];
      const params = [loginId];
      let i = 2;
      if (username) { updates.push(`username = $${i++}`); params.push(username); }
      if (password) { updates.push(`password = $${i++}`); params.push(password); }
      if (role) { updates.push(`role = $${i++}`); params.push(role); }
      if (permissions) { updates.push(`permissions = $${i++}`); params.push(permissions); }

      if (updates.length === 0) throw new Error("No fields to update");

      const res = await pool.query(
        `UPDATE public.logins SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );
      if (res.rows.length === 0) throw new Error("Compte introuvable dans la table logins.");
      const row = res.rows[0];
      await createNotification('system', "Action Administrative: Accès Modifié", `Le compte d'accès de ${row.username} a été mis à jour par un administrateur.`, null, context.userDone);

      // Sync permissions to users table if updated
      if (permissions) {
        try { await pool.query('UPDATE public.users SET permissions = $2 WHERE username = $1', [row.username, permissions]); } catch (e) { }
      }

      return {
        ...row,
        permissions: typeof row.permissions === 'object' ? JSON.stringify(row.permissions) : row.permissions
      };
    },
    deleteLoginAccount: async (_: any, { id }: { id: string }, context: any) => {
      const dbId = id.replace('login-', '').replace('user-', '');
      const check = await pool.query('SELECT username FROM public.logins WHERE id = $1', [dbId]);
      const username = check.rows[0]?.username || "Inconnu";
      await pool.query('DELETE FROM public.logins WHERE id = $1', [dbId]);
      await createNotification('system', "Action Administrative: Accès Supprimé", `L'accès système pour ${username} a été supprimé.`, null, context.userDone);
      return true;
    },
    changePassword: async (_: any, { userId, oldPassword, newPassword }: any) => {
      const dbId = userId.toString().replace('user-', '').replace('login-', '');

      // Direct ID lookup in logins table as requested
      const loginCheck = await pool.query('SELECT id, password, username FROM public.logins WHERE id = $1', [dbId]);

      if (loginCheck.rows.length === 0) {
        // Fallback: If ID lookup fails, try username (legacy/admin case)
        const usernameCheck = await pool.query('SELECT id, password, username FROM public.logins WHERE username = $1', [userId]);
        if (usernameCheck.rows.length === 0) {
          throw new Error(`Compte de connexion introuvable (ID: ${dbId})`);
        }
        // Found by username
        const user = usernameCheck.rows[0];
        if (user.password !== oldPassword) throw new Error("Mot de passe actuel incorrect");
        await pool.query('UPDATE public.logins SET password = $1 WHERE id = $2', [newPassword, user.id]);
        return true;
      }

      const currentLogin = loginCheck.rows[0];

      if (currentLogin.password !== oldPassword) {
        throw new Error("Mot de passe actuel incorrect");
      }

      await pool.query('UPDATE public.logins SET password = $1 WHERE id = $2', [newPassword, currentLogin.id]);
      return true;
    },

    deleteUser: async (_: any, { id }: { id: string }, context: any) => {
      try {
        await pool.query('DELETE FROM public.cardcin WHERE user_id = $1', [id]);
        const tablesRes = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'paiecurrent_%'`);
        for (const row of tablesRes.rows) {
          try {
            await pool.query(`DELETE FROM public."${row.tablename}" WHERE user_id = $1`, [id]);
          } catch (e) { console.error(e); }
        }
        await pool.query('DELETE FROM public.user_schedules WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM public.retards WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM public.absents WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM public.avances WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM public.extras WHERE user_id = $1', [id]);
        const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [id]);
        const username = userRes.rows[0]?.username || "Inconnu";
        const result = await pool.query('DELETE FROM public.users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length > 0) {
          await createNotification('system', "Employé Supprimé", `L'employé ${username} (ID: ${id}) a été supprimé du système.`, null, context.userDone);
        }
        return result.rows.length > 0;
      } catch (e) {
        console.error('Error deleting user:', e);
        throw new Error('Failed to delete user');
      }
    },
    updateUserSchedule: async (_: any, { userId, schedule }: { userId: string, schedule: any }, context: any) => {
      const { dim, lun, mar, mer, jeu, ven, sam, is_coupure, is_fixed, p1_in, p1_out, p2_in, p2_out, fixed_in, fixed_out } = schedule;
      const check = await pool.query('SELECT user_id FROM public.user_schedules WHERE user_id = $1', [userId]);

      if (check.rows.length === 0) {
        const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [userId]);
        const username = userRes.rows[0]?.username || "Unknown";
        const res = await pool.query(
          `INSERT INTO public.user_schedules(user_id, username, dim, lun, mar, mer, jeu, ven, sam, is_coupure, is_fixed, p1_in, p1_out, p2_in, p2_out, fixed_in, fixed_out) 
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
          [
            userId, username,
            dim ?? null, lun ?? null, mar ?? null, mer ?? null, jeu ?? null, ven ?? null, sam ?? null,
            is_coupure ?? false, is_fixed ?? false,
            p1_in ?? '08:00', p1_out ?? '12:00', p2_in ?? '14:00', p2_out ?? '18:00',
            fixed_in ?? '08:00', fixed_out ?? '17:00'
          ]
        );
        await createNotification('schedule', "Emploi du temps créé", `L'emploi du temps de ${username} a été initialisé.`, userId, context.userDone);
        return res.rows[0];
      } else {
        const res = await pool.query(
          `UPDATE public.user_schedules 
           SET dim = COALESCE($2, dim), lun = COALESCE($3, lun), mar = COALESCE($4, mar), 
               mer = COALESCE($5, mer), jeu = COALESCE($6, jeu), ven = COALESCE($7, ven), 
               sam = COALESCE($8, sam), 
               is_coupure = COALESCE($9, is_coupure), 
               p1_in = COALESCE($10, p1_in), p1_out = COALESCE($11, p1_out), 
               p2_in = COALESCE($12, p2_in), p2_out = COALESCE($13, p2_out),
               is_fixed = COALESCE($14, is_fixed),
               fixed_in = COALESCE($15, fixed_in), fixed_out = COALESCE($16, fixed_out)
           WHERE user_id = $1 RETURNING *`,
          [
            userId,
            dim ?? null, lun ?? null, mar ?? null, mer ?? null, jeu ?? null, ven ?? null, sam ?? null,
            is_coupure !== undefined ? is_coupure : null,
            p1_in ?? null, p1_out ?? null, p2_in ?? null, p2_out ?? null,
            is_fixed !== undefined ? is_fixed : null,
            fixed_in ?? null, fixed_out ?? null
          ]
        );
        const row = res.rows[0];

        // Auto-sync current month since schedule changed
        await syncUserMonthAutomatically(userId);

        await createNotification('schedule', "Emploi du temps modifié", `L'emploi du temps de ${row.username} a été mis à jour.`, userId, context.userDone);
        return row;
      }
    },
    addAdvance: async (_: any, { montant, user_id, motif, date }: any, context: any) => {
      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      if (userRes.rows.length === 0) throw new Error("User not found");
      const username = userRes.rows[0].username;

      const dateObj = date ? new Date(date) : new Date();
      const dateStr = dateObj.toISOString().split('T')[0];
      const month = dateObj.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

      const res = await pool.query(
        `INSERT INTO public.avances(montant, username, user_id, date, month, motif, statut) VALUES($1, $2, $3, $4, $5, $6, 'Validé') RETURNING *`,
        [montant, username, user_id, dateStr, month, motif]
      );

      await recomputePayrollForDate(dateStr, user_id);
      await createNotification('avance', "Nouvelle avance enregistrée", `${username} a reçu une avance de ${montant} TND.`, user_id, context.userDone, `/advances?userId=${user_id}`);

      return {
        ...res.rows[0],
        montant: parseFloat(res.rows[0].montant || 0),
        date: formatDateLocal(res.rows[0].date)
      };
    },
    updateAdvance: async (_: any, { id, date, montant, motif }: any) => {
      const updates = [];
      const params = [id];
      let paramIdx = 2;

      if (date) {
        const dateObj = new Date(date);
        const dateStr = dateObj.toISOString().split('T')[0];
        const month = dateObj.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        updates.push(`date = $${paramIdx++}, month = $${paramIdx++} `);
        params.push(dateStr, month);
      }

      if (montant !== undefined && montant !== null) {
        updates.push(`montant = $${paramIdx++} `);
        params.push(montant);
      }

      if (motif !== undefined && motif !== null) {
        updates.push(`motif = $${paramIdx++} `);
        params.push(motif);
      }

      if (updates.length === 0) return null;

      const res = await pool.query(`UPDATE public.avances SET ${updates.join(', ')} WHERE id = $1 RETURNING *`, params);
      if (res.rows.length === 0) throw new Error("Advance not found");

      await recomputePayrollForDate(formatDateLocal(res.rows[0].date) as string, res.rows[0].user_id);

      return {
        ...res.rows[0],
        montant: parseFloat(res.rows[0].montant || 0),
        date: formatDateLocal(res.rows[0].date)
      };
    },
    updateAdvanceStatus: async (_: any, { id, statut }: { id: string, statut: string }, context: any) => {
      const res = await pool.query(`UPDATE public.avances SET statut = $2 WHERE id = $1 RETURNING *`, [id, statut]);
      if (res.rows.length === 0) return null;

      const row = res.rows[0];
      await recomputePayrollForDate(formatDateLocal(row.date) as string, row.user_id);

      if (statut === 'Validé' || statut === 'Payé') {
        await createNotification('avance', "Avance approuvée", `L'avance de ${row.montant} TND for ${row.username} a été ${statut.toLowerCase()}.`, row.user_id, context.userDone, `/advances?userId=${row.user_id}`);
      }

      return {
        ...res.rows[0],
        montant: parseFloat(res.rows[0].montant || 0),
        date: formatDateLocal(res.rows[0].date)
      };
    },
    deleteAdvance: async (_: any, { id }: { id: string }, context: any) => {
      const info = await pool.query('SELECT user_id, date FROM public.avances WHERE id = $1', [id]);
      if (info.rows.length === 0) return false;
      const { user_id, date } = info.rows[0];

      const res = await pool.query('DELETE FROM public.avances WHERE id = $1', [id]);
      await recomputePayrollForDate(formatDateLocal(date) as string, user_id);
      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      await createNotification('system', "Avance Supprimée", `Une avance pour ${userRes.rows[0]?.username || 'Inconnu'} datée du ${formatDateLocal(date)} a été supprimée.`, user_id, context.userDone);
      return (res.rowCount || 0) > 0;
    },
    addRetard: async (_: any, { user_id, date, reason }: any, context: any) => {
      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      if (userRes.rows.length === 0) throw new Error("User not found");
      const username = userRes.rows[0].username;

      const res = await pool.query(`INSERT INTO public.retards(user_id, username, date, reason) VALUES($1, $2, $3, $4) RETURNING *`, [user_id, username, date, reason]);

      const dateSQL = formatDateLocal(date);
      const monthKey = dateSQL?.substring(0, 7).replace('-', '_');
      try {
        await pool.query(`UPDATE public."paiecurrent_${monthKey}" SET updated = FALSE WHERE user_id = $1 AND date = $2`, [user_id, dateSQL]);
      } catch (e) { }

      await recomputePayrollForDate(dateSQL as string, user_id);
      invalidateCache();
      await createNotification('pointage', "Action Administrative: Retard Enregistré", `${username} a été marqué en retard le ${formatDateLocal(date)}: ${reason}`, user_id, context.userDone, `/attendance?userId=${user_id}&date=${date}`);
      return { ...res.rows[0], date: formatDateLocal(res.rows[0].date) };
    },
    deleteRetard: async (_: any, { id }: { id: string }, context: any) => {
      const info = await pool.query('SELECT user_id, date FROM public.retards WHERE id = $1', [id]);
      if (info.rows.length === 0) return false;
      const { user_id, date } = info.rows[0];
      const res = await pool.query('DELETE FROM public.retards WHERE id = $1', [id]);

      const dateSQL = formatDateLocal(date);
      const monthKey = dateSQL?.substring(0, 7).replace('-', '_');
      try {
        await pool.query(`UPDATE public."paiecurrent_${monthKey}" SET updated = FALSE WHERE user_id = $1 AND date = $2`, [user_id, dateSQL]);
      } catch (e) { }

      await recomputePayrollForDate(dateSQL as string, user_id);
      invalidateCache();

      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      await createNotification('system', "Retard Supprimé", `Le retard de ${userRes.rows[0]?.username || 'Inconnu'} pour le ${formatDateLocal(date)} a été supprimé.`, user_id, context.userDone);
      return (res.rowCount || 0) > 0;
    },
    updateRetard: async (_: any, { id, reason }: { id: string, reason: string }, context: any) => {
      const info = await pool.query('SELECT user_id, date FROM public.retards WHERE id = $1', [id]);
      if (info.rows.length === 0) throw new Error("Retard record not found");
      const { user_id, date } = info.rows[0];
      const res = await pool.query('UPDATE public.retards SET reason = $1 WHERE id = $2 RETURNING *', [reason, id]);
      await recomputePayrollForDate(formatDateLocal(date) as string, user_id);
      const row = res.rows[0];
      await createNotification('system', "Retard Modifié", `Le retard de ${row.username} pour le ${formatDateLocal(date)} a été mis à jour: ${reason}`, user_id, context.userDone);
      return { ...row, date: row.date ? formatDateTimeLocal(row.date) : null };
    },
    addAbsent: async (_: any, { user_id, date, type, reason }: any, context: any) => {
      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      if (userRes.rows.length === 0) throw new Error("User not found");
      const username = userRes.rows[0].username;

      const res = await pool.query(`INSERT INTO public.absents(user_id, username, date, type, reason) VALUES($1, $2, $3, $4, $5) RETURNING *`, [user_id, username, date, type, reason]);

      const dateSQL = formatDateLocal(date);
      const monthKey = dateSQL?.substring(0, 7).replace('-', '_');
      try {
        await pool.query(`UPDATE public."paiecurrent_${monthKey}" SET updated = FALSE WHERE user_id = $1 AND date = $2`, [user_id, dateSQL]);
      } catch (e) { }

      await recomputePayrollForDate(dateSQL as string, user_id);
      invalidateCache();
      await createNotification('pointage', "Action Administrative: Absence Enregistrée", `${username} a été marqué absent (${type}) le ${formatDateLocal(date)}.`, user_id, context.userDone, `/attendance?userId=${user_id}&date=${date}`);
      return { ...res.rows[0], date: formatDateLocal(res.rows[0].date) };
    },
    deleteAbsent: async (_: any, { id }: { id: string }, context: any) => {
      const info = await pool.query('SELECT user_id, date FROM public.absents WHERE id = $1', [id]);
      if (info.rows.length === 0) return false;
      const { user_id, date } = info.rows[0];
      const res = await pool.query('DELETE FROM public.absents WHERE id = $1', [id]);

      const dateSQL = formatDateLocal(date);
      const monthKey = dateSQL?.substring(0, 7).replace('-', '_');
      try {
        await pool.query(`UPDATE public."paiecurrent_${monthKey}" SET updated = FALSE WHERE user_id = $1 AND date = $2`, [user_id, dateSQL]);
      } catch (e) { }

      await recomputePayrollForDate(dateSQL as string, user_id);
      invalidateCache();

      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      await createNotification('system', "Absence Supprimée", `L'absence de ${userRes.rows[0]?.username || 'Inconnu'} pour le ${formatDateLocal(date)} a été supprimée.`, user_id, context.userDone);
      return (res.rowCount || 0) > 0;
    },
    updateAbsent: async (_: any, { id, type, reason }: { id: string, type?: string, reason?: string }) => {
      const info = await pool.query('SELECT user_id, date FROM public.absents WHERE id = $1', [id]);
      if (info.rows.length === 0) throw new Error("Absent record not found");
      const { user_id, date } = info.rows[0];

      const updates = [];
      const params: any[] = [id];
      let pIdx = 2;
      if (type !== undefined) { updates.push(`type = $${pIdx++} `); params.push(type); }
      if (reason !== undefined) { updates.push(`reason = $${pIdx++} `); params.push(reason); }

      const res = await pool.query(`UPDATE public.absents SET ${updates.join(', ')} WHERE id = $1 RETURNING *`, params);
      await recomputePayrollForDate(formatDateLocal(date) as string, String(user_id));
      return { ...res.rows[0], date: formatDateLocal(res.rows[0].date) };
    },
    addExtra: async (_: any, { user_id, montant, date_extra, motif }: any, context: any) => {
      // Use a subquery to insert with username in one go for speed
      const res = await pool.query(
        `INSERT INTO public.extras(user_id, username, montant, date_extra, motif) 
         SELECT id, username, $2, $3, $4 FROM public.users WHERE id = $1 
         RETURNING *`,
        [user_id, montant, date_extra, motif]
      );

      if (res.rows.length === 0) throw new Error("User not found or insertion failed");
      const row = res.rows[0];

      // Run recompute and notification in parallel
      await Promise.all([
        recomputePayrollForDate(formatDateLocal(date_extra) as string, String(user_id)),
        createNotification('payment', "Nouveau paiement (Extra)", `${row.username} a reçu un extra de ${montant} TND pour: ${motif || 'Non spécifié'}`, user_id, context.userDone, `/payroll?userId=${user_id}`)
      ]);

      return { ...row, montant: parseFloat(row.montant || 0), date_extra: formatDateTimeLocal(row.date_extra) };
    },
    deleteExtra: async (_: any, { id }: { id: string }, context: any) => {
      const info = await pool.query('SELECT user_id, date_extra FROM public.extras WHERE id = $1', [id]);
      if (info.rows.length === 0) return false;
      const { user_id, date_extra } = info.rows[0];
      const res = await pool.query('DELETE FROM public.extras WHERE id = $1', [id]);
      await recomputePayrollForDate(formatDateLocal(date_extra) as string, String(user_id));
      const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [user_id]);
      await createNotification('system', "Paiement Extra Supprimé", `Le paiement extra pour ${userRes.rows[0]?.username || 'Inconnu'} du ${formatDateLocal(date_extra)} a été supprimé.`, user_id, context.userDone);
      return (res.rowCount || 0) > 0;
    },
    updateExtra: async (_: any, { id, montant, motif, date_extra }: { id: string, montant?: number, motif?: string, date_extra?: string }, context: any) => {
      const info = await pool.query('SELECT user_id, date_extra FROM public.extras WHERE id = $1', [id]);
      if (info.rows.length === 0) throw new Error("Extra record not found");
      const { user_id, date_extra: oldDate } = info.rows[0];

      const updates = [];
      const params: any[] = [id];
      let pIdx = 2;
      if (montant !== undefined) { updates.push(`montant = $${pIdx++} `); params.push(montant); }
      if (motif !== undefined) { updates.push(`motif = $${pIdx++} `); params.push(motif); }
      if (date_extra !== undefined) { updates.push(`date_extra = $${pIdx++} `); params.push(date_extra); }

      const res = await pool.query(`UPDATE public.extras SET ${updates.join(', ')} WHERE id = $1 RETURNING *`, params);

      // Sync old date if date changed
      if (date_extra && formatDateLocal(date_extra) !== formatDateLocal(oldDate)) {
        await recomputePayrollForDate(formatDateLocal(oldDate) as string, String(user_id));
      }
      // Sync (new) date
      await recomputePayrollForDate(formatDateLocal(date_extra || oldDate) as string, String(user_id));

      const row = res.rows[0];
      return { ...row, montant: parseFloat(row.montant || 0), date_extra: formatDateTimeLocal(row.date_extra) };
    },
    addDoublage: async (_: any, { user_id, montant, date }: any, context: any) => {
      // Use subquery for speed
      const res = await pool.query(
        `INSERT INTO public.doublages(user_id, username, montant, date) 
         SELECT id, username, $2, $3 FROM public.users WHERE id = $1 
         RETURNING *`,
        [user_id, montant, date]
      );

      if (res.rows.length === 0) throw new Error("User not found or insertion failed");
      const row = res.rows[0];

      await Promise.all([
        recomputePayrollForDate(formatDateLocal(date) as string, String(user_id)),
        createNotification('payment', "Nouveau paiement (Doublage)", `${row.username} a reçu un doublage de ${montant} TND.`, user_id, context.userDone, `/payroll?userId=${user_id}`)
      ]);

      return { ...row, montant: parseFloat(row.montant || 0), date: formatDateTimeLocal(row.date) };
    },
    deleteDoublage: async (_: any, { id }: { id: string }) => {
      const info = await pool.query('SELECT user_id, date FROM public.doublages WHERE id = $1', [id]);
      if (info.rows.length === 0) return false;
      const { user_id, date } = info.rows[0];
      const res = await pool.query('DELETE FROM public.doublages WHERE id = $1', [id]);
      await recomputePayrollForDate(formatDateLocal(date) as string, String(user_id));
      return (res.rowCount || 0) > 0;
    },
    updateDoublage: async (_: any, { id, montant, date }: { id: string, montant?: number, date?: string }) => {
      const info = await pool.query('SELECT user_id, date FROM public.doublages WHERE id = $1', [id]);
      if (info.rows.length === 0) throw new Error("Doublage record not found");
      const { user_id, date: oldDate } = info.rows[0];

      const updates = [];
      const params: any[] = [id];
      let pIdx = 2;
      if (montant !== undefined) { updates.push(`montant = $${pIdx++} `); params.push(montant); }
      if (date !== undefined) { updates.push(`date = $${pIdx++} `); params.push(date); }

      const res = await pool.query(`UPDATE public.doublages SET ${updates.join(', ')} WHERE id = $1 RETURNING *`, params);

      // Sync old date if date changed
      if (date && formatDateLocal(date) !== formatDateLocal(oldDate)) {
        await recomputePayrollForDate(formatDateLocal(oldDate) as string, String(user_id));
      }
      // Sync (new) date
      await recomputePayrollForDate(formatDateLocal(date || oldDate) as string, String(user_id));

      const row = res.rows[0];
      return { ...row, montant: parseFloat(row.montant || 0), date: formatDateTimeLocal(row.date) };
    },
    initPayrollMonth: async (_: any, { month }: { month: string }) => {
      return await initializePayrollTable(month);
    },
    updatePayrollRecord: async (_: any, { month, id, input }: any) => {
      const tableName = `paiecurrent_${month}`;

      // 1. Get existing record to know user_id and date
      const record = (await pool.query(`SELECT user_id, username, date FROM public."${tableName}" WHERE id = $1`, [id])).rows[0];
      if (!record) throw new Error("Payroll record not found");

      const { user_id, username, date } = record;
      const dateSQL = formatDateLocal(date);

      // 2. Clear caches to ensure fresh data across the dashboard/other pages
      invalidateCache();

      // 3. Mark this record as manually updated FIRST, so it won't be overwritten during recompute
      const updateResult = await pool.query(`UPDATE public."${tableName}" SET updated = TRUE WHERE id = $1`, [id]);

      // 4. Recompute everything for that date based on machine data/master tables
      // This will now skip this record since updated = TRUE (for past days)
      await recomputePayrollForDate(dateSQL as string, String(user_id));

      // 5. Then apply manual overrides from the fiche (these "win" for this specific record)
      // If an 'extra' is added manually from the fiche, force present = 0
      if (input.extra > 0) {
        input.present = 0;
      }

      const updates: string[] = [];
      const params: any[] = [id];
      let i = 2;

      for (const [key, val] of Object.entries(input)) {
        if (key === 'id') continue;
        updates.push(`"${key}" = $${i++}`);
        if (key === 'retard') params.push(parseInt(String(val || 0)));
        else params.push(val);
      }

      if (updates.length > 0) {
        await pool.query(`UPDATE public.\"${tableName}\" SET ${updates.join(', ')} WHERE id = $1`, params);
      }
      const payrollUrl = dateSQL ? `/payroll/fiche/${user_id}?month=${dateSQL.substring(0, 7).replace('-', '_')}` : `/payroll/fiche/${user_id}`;
      await createNotification('system', "Mise à jour Fiche de Paie", `La fiche de paie de ${username} pour le ${dateSQL} a été mise à jour par un manageur.`, user_id, null, payrollUrl);

      // 5. Sync back to master tables based on input (persists the manual overrides)

      // ABSENTS Sync (Presence / Remarque / Mise à pied)
      if (input.present !== undefined || input.remarque !== undefined || input.mise_a_pied !== undefined) {
        // If they set present = 1, we ensure type is 'Présent' or 'Justifié'
        // If they set present = 0, we ensure type is 'Injustifié'
        let type = (input.present === 1) ? 'Présent' : 'Injustifié';
        if (input.mise_a_pied > 0) type = 'Mise à pied';
        let reason = input.remarque || (type === 'Mise à pied' ? `${input.mise_a_pied} jours` : type);

        const check = await pool.query('SELECT id FROM public.absents WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        if (check.rows.length > 0) {
          await pool.query('UPDATE public.absents SET type = $1, reason = $2 WHERE id = $3', [type, reason, check.rows[0].id]);
        } else {
          await pool.query('INSERT INTO public.absents(user_id, username, date, type, reason) VALUES($1, $2, $3, $4, $5)', [user_id, username, dateSQL, type, reason]);
        }
      }

      // RETARDS Sync
      if (input.retard !== undefined) {
        const check = await pool.query('SELECT id FROM public.retards WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        if (input.retard > 0) {
          // Use provided remark as reason if available, otherwise use "X min"
          const reason = input.remarque || `${input.retard} min`;
          if (check.rows.length > 0) {
            await pool.query('UPDATE public.retards SET reason = $1 WHERE id = $2', [reason, check.rows[0].id]);
            for (let k = 1; k < check.rows.length; k++) {
              await pool.query('DELETE FROM public.retards WHERE id = $1', [check.rows[k].id]);
            }
          } else {
            await pool.query('INSERT INTO public.retards(user_id, username, date, reason) VALUES($1, $2, $3, $4)', [user_id, username, dateSQL, reason]);
          }
        } else if (check.rows.length > 0) {
          // If retard is 0 or less, we remove the record to clear the 'Retard' status
          await pool.query('DELETE FROM public.retards WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        }
      }

      // EXTRAS Sync (Extra / Prime / Infraction)
      // Note: We create/update specific records in 'extras' table
      const syncExtra = async (val: number | undefined, label: string) => {
        if (val === undefined) return;
        const motifPrefix = label.toLowerCase();
        const check = await pool.query(`SELECT id FROM public.extras WHERE user_id = $1 AND date_extra::date = $2::date AND LOWER(motif) LIKE $3`, [user_id, dateSQL, `${motifPrefix}%`]);

        const motif = (label === 'Extra') ? 'Extra' : label;

        if (val === 0) {
          // If value is 0 and no record exists, don't create one (avoid cluttering)
          if (check.rows.length === 0) return;

          // If record exists and value is set to 0:
          // For Extra/Prime, we can just delete it because 0 is the default anyway.
          // For Infraction, we might want to keep it as 0 to override an automatic penalty.
          if (label !== 'Infraction') {
            await pool.query('DELETE FROM public.extras WHERE id = $1', [check.rows[0].id]);
            return;
          }
          // For Infraction, update to 0 so the override remains active.
          await pool.query('UPDATE public.extras SET montant = 0, motif = $1 WHERE id = $2', [motif, check.rows[0].id]);
          return;
        }

        if (check.rows.length > 0) {
          await pool.query('UPDATE public.extras SET montant = $1, motif = $2 WHERE id = $3', [val, motif, check.rows[0].id]);
          // Cleanup duplicates
          if (check.rows.length > 1) {
            for (let k = 1; k < check.rows.length; k++) {
              await pool.query('DELETE FROM public.extras WHERE id = $1', [check.rows[k].id]);
            }
          }
        } else {
          await pool.query('INSERT INTO public.extras(user_id, username, montant, date_extra, motif) VALUES($1, $2, $3, $4, $5)', [user_id, username, val, dateSQL, motif]);
        }
      };

      await syncExtra(input.extra, 'Extra');
      await syncExtra(input.prime, 'Prime');

      // Update Manual Infraction directly (Override Semantics)
      // If input.infraction is provided, we save it as the value in Extras.
      // recomputePayrollForDate will prioritize this value over the automatic one.
      // Determine authoritative Retard value to calculate Auto Part correctly
      let effectiveRetard = (record.retard || 0);

      // 1. Prefer Input (Manual Edit)
      if (input.retard !== undefined) {
        effectiveRetard = input.retard;
      } else {
        // 2. Fallback to Retards table (Source of Truth) because paiecurrent.retard might be stale/zero
        const retardCheck = await pool.query('SELECT reason FROM public.retards WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        if (retardCheck.rows.length > 0) {
          const match = retardCheck.rows[0].reason?.match(/(\d+)\s*min/);
          if (match) effectiveRetard = parseInt(match[1]);
        }
      }

      // Update Manual Infraction directly (Override Semantics)
      // Save the exact value provided by the user. 
      // recomputePayrollForDate is configured to use this value and ignore the automatic penalty if this record exists.
      if (input.infraction !== undefined) {
        await syncExtra(input.infraction, 'Infraction');
      }

      // AVANCES Sync (Acompte)
      if (input.acompte !== undefined) {
        const check = await pool.query('SELECT id FROM public.avances WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        if (input.acompte > 0) {
          const month = new Date(dateSQL as string).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
          if (check.rows.length > 0) {
            await pool.query('UPDATE public.avances SET montant = $1, statut = $2 WHERE id = $3', [input.acompte, 'Validé', check.rows[0].id]);
            if (check.rows.length > 1) {
              for (let k = 1; k < check.rows.length; k++) {
                await pool.query('DELETE FROM public.avances WHERE id = $1', [check.rows[k].id]);
              }
            }
          } else {
            await pool.query('INSERT INTO public.avances(user_id, username, montant, date, month, motif, statut) VALUES($1, $2, $3, $4, $5, $6, $7)',
              [user_id, username, input.acompte, dateSQL, month, 'Avance sur salaire (Fiche)', 'Validé']);
          }
        } else if (check.rows.length > 0) {
          await pool.query('DELETE FROM public.avances WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        }
      }

      // Doublage Sync
      if (input.doublage !== undefined) {
        const check = await pool.query('SELECT id FROM public.doublages WHERE user_id = $1 AND date::date = $2::date', [user_id, dateSQL]);
        if (input.doublage > 0) {
          if (check.rows.length > 0) {
            await pool.query('UPDATE public.doublages SET montant = $1 WHERE id = $2', [input.doublage, check.rows[0].id]);
          } else {
            await pool.query('INSERT INTO public.doublages(user_id, username, montant, date) VALUES($1, $2, $3, $4)', [user_id, username, input.doublage, dateSQL]);
          }
        } else if (check.rows.length > 0) {
          await pool.query('DELETE FROM public.doublages WHERE id = $1', [check.rows[0].id]);
        }
      }

      // 6. Recalculate clock_in time if retard was manually changed
      if (input.retard !== undefined) {
        // Fetch user schedule to determine shift type
        const scheduleRes = await pool.query('SELECT * FROM public.user_schedules WHERE user_id = $1', [user_id]);
        const schedule = scheduleRes.rows[0];

        if (schedule) {
          const targetDate = new Date(dateSQL as string + 'T12:00:00');
          const dayOfWeekIndex = targetDate.getDay();
          const dayCols = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
          const dayCol = dayCols[dayOfWeekIndex];
          let shiftType = schedule[dayCol] || "Repos";

          // Get user info for department check
          const userRes = await pool.query('SELECT "département" as departement FROM public.users WHERE id = $1', [user_id]);
          const userDept = userRes.rows[0]?.departement;

          let newClockIn = null;

          if (shiftType !== "Repos") {
            if (userDept === 'Chef_Cuisine') {
              // Chef has shift starting at 11:00 AM
              const shiftStart = new Date(dateSQL as string + 'T11:00:00.000+01:00');
              const actualArrival = new Date(shiftStart.getTime() + (input.retard * 60000));
              newClockIn = formatTime(actualArrival.toISOString());
            } else {
              // Regular employees: Matin starts at 7:00, Soir at 16:00
              let startHour = 7;
              if (shiftType === "Soir") startHour = 16;

              const shiftStart = new Date(dateSQL as string + `T${String(startHour).padStart(2, '0')}:00:00.000+01:00`);
              const actualArrival = new Date(shiftStart.getTime() + (input.retard * 60000));
              newClockIn = formatTime(actualArrival.toISOString());
            }

            // Update clock_in in payroll table
            if (newClockIn) {
              await pool.query(`UPDATE public."${tableName}" SET clock_in = $1 WHERE id = $2`, [newClockIn, id]);

              // Update raw fingerprint table
              const rawTableName = (dateSQL as string).replace(/-/g, '_');
              // Check if table exists
              const tableCheck = await pool.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
                [rawTableName]
              );

              if (tableCheck.rows[0].exists) {
                // Find the first punch for this user that logically belongs to this day (>= 04:00)
                const punchesRes = await pool.query(
                  `SELECT id, device_time FROM public."${rawTableName}" 
                   WHERE user_id = $1 
                   AND device_time >= ($2::text || ' 04:00:00')::timestamp
                   ORDER BY device_time ASC LIMIT 1`,
                  [user_id, dateSQL]
                );

                if (punchesRes.rows.length > 0) {
                  const firstPunchId = punchesRes.rows[0].id;
                  const originalPunchTime = new Date(punchesRes.rows[0].device_time);

                  // Reconstruct new punch time: keep current date, use new hours/mins
                  const [newH, newM] = newClockIn.split(':').map(Number);

                  // Use local time construction to avoid TZ issues
                  const newDateObj = new Date(originalPunchTime);
                  newDateObj.setHours(newH, newM, 0, 0);

                  // Format back to SQL format (YYYY-MM-DD HH:mm:ss)
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const newSQLTime = `${newDateObj.getFullYear()}-${pad(newDateObj.getMonth() + 1)}-${pad(newDateObj.getDate())} ${pad(newDateObj.getHours())}:${pad(newDateObj.getMinutes())}:00`;

                  await pool.query(
                    `UPDATE public."${rawTableName}" SET device_time = $1 WHERE id = $2`,
                    [newSQLTime, firstPunchId]
                  );
                }
              }
            }
          }
        }
      }

      const finalRes = await pool.query(`SELECT * FROM public."${tableName}" WHERE id = $1`, [id]);
      return { ...finalRes.rows[0], date: formatDateLocal(finalRes.rows[0].date) };
    },
    uploadCinCard: async (_: any, { userId, cinPhotoFront, cinPhotoBack }: { userId: string, cinPhotoFront?: string, cinPhotoBack?: string }) => {
      const check = await pool.query('SELECT id FROM public.cardcin WHERE user_id = $1', [userId]);

      if (check.rows.length > 0) {
        const updates = [];
        const params = [userId];
        let paramIndex = 2;

        if (cinPhotoFront) {
          updates.push(`cin_photo_front = $${paramIndex++} `);
          params.push(cinPhotoFront);
        }
        if (cinPhotoBack) {
          updates.push(`cin_photo_back = $${paramIndex++} `);
          params.push(cinPhotoBack);
        }

        if (updates.length > 0) {
          updates.push(`uploaded_at = CURRENT_TIMESTAMP`);
          const res = await pool.query(`UPDATE public.cardcin SET ${updates.join(', ')} WHERE user_id = $1 RETURNING *`, params);
          return res.rows[0];
        }
        return check.rows[0];
      } else {
        const res = await pool.query(`INSERT INTO public.cardcin(user_id, cin_photo_front, cin_photo_back) VALUES($1, $2, $3) RETURNING *`, [userId, cinPhotoFront || null, cinPhotoBack || null]);
        return res.rows[0];
      }
    },
    syncAttendance: async (_: any, { date, userId, month }: { date?: string, userId?: string, month?: string }) => {
      // Monthly Cleanup Check
      const now = new Date();
      if (now.getDate() === 1 || Math.random() < 0.05) {
        await cleanOldNotifications();
      }

      if (userId && month) {
        // Targeted Full-Month sync for one user
        const tableName = `paiecurrent_${month}`;
        if (!/^\d{4}_\d{2}$/.test(month)) throw new Error("Format de mois invalide");

        const [y, mIdx] = month.split('_').map(Number);
        const daysInMonth = new Date(y, mIdx, 0).getDate();
        const start = `${y}-${String(mIdx).padStart(2, '0')}-01`;
        const endDay = new Date(y, mIdx, 1);
        const end = endDay.toISOString().split('T')[0];

        // Aggressive cleanup: remove all non-manual overlay records for this user/month
        await pool.query(`
          DELETE FROM public.absents 
          WHERE user_id = $1 
          AND date >= $2 AND date < $3 
          AND (reason IS NULL OR reason NOT LIKE 'Manual:%')
        `, [userId, start, end]);

        await pool.query(`
          DELETE FROM public.retards 
          WHERE user_id = $1 
          AND date >= $2 AND date < $3 
          AND (reason IS NULL OR reason NOT LIKE 'Manual:%')
        `, [userId, start, end]);

        for (let d = 1; d <= daysInMonth; d++) {
          const dStr = `${y}-${String(mIdx).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          await recomputePayrollForDate(dStr, String(userId));
        }
        invalidateCache();
        return true;
      }

      const todayStr = date || formatDateLocal(new Date()) as string;
      const nowTs = Date.now();
      const lastSync = lastSyncThrottle.get(todayStr);
      if (lastSync && nowTs - lastSync < 60000) { // Throttle: 1 minute
        // If it's a manual date, bypass throttle
        if (!date) return true;
      }
      if (!date) lastSyncThrottle.set(todayStr, nowTs);

      // Default: Only sync Today and Yesterday for performance.
      const daysToSync = 2;
      const syncPromises = [];
      const baseDate = new Date(todayStr + 'T12:00:00');

      for (let i = 0; i < daysToSync; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        syncPromises.push(recomputePayrollForDate(formatDateLocal(d) as string));
      }

      await Promise.all(syncPromises);
      invalidateCache();
      return true;
    },
    migratePayrollUpdatedColumn: async (_: any, { month }: { month: string }) => {
      const tableName = `paiecurrent_${month}`;
      try {
        await pool.query(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS updated BOOLEAN DEFAULT FALSE`);
        return true;
      } catch (err) {
        console.error(`Error adding updated column to ${tableName}:`, err);
        throw err;
      }
    },
    markNotificationsAsRead: async (_: any, { userId }: { userId: string }) => {
      let role = '';
      let dbId = userId;
      let isLoginId = userId.startsWith('login-');
      let isUserId = userId.startsWith('user-');

      // Normalize ID
      if (isLoginId) dbId = userId.replace('login-', '');
      else if (isUserId) dbId = userId.replace('user-', '');

      // Strategy: Try to determine role accurately based on ID hint
      if (isLoginId) {
        const loginRes = await pool.query('SELECT role FROM public.logins WHERE id = $1', [dbId]);
        role = loginRes.rows[0]?.role;
      } else if (isUserId) {
        const userRes = await pool.query('SELECT role FROM public.users WHERE id = $1', [dbId]);
        role = userRes.rows[0]?.role;
      } else {
        // No prefix? Try Logins first (Admin priority), then Users
        const loginRes = await pool.query('SELECT role FROM public.logins WHERE id = $1', [dbId]);
        if (loginRes.rows.length > 0) {
          role = loginRes.rows[0].role;
        } else {
          const userRes = await pool.query('SELECT role FROM public.users WHERE id = $1', [dbId]);
          role = userRes.rows[0]?.role;
        }
      }

      const normalizedRole = (role || '').toLowerCase();

      // FAILSAFE: If ID is '1' (primary admin), force admin rights for notification clearing
      // This solves the issue where the main admin can see other users' notifications but cannot clear them
      // because the DB lookup might classify them as a regular 'user' or checks fail.
      const effectiveRole = (userId === '1' || userId === 'user-1') ? 'admin' : normalizedRole;

      // Expanded role check for safety
      if (['admin', 'manager', 'administrateur', 'superadmin'].includes(effectiveRole)) {
        // Admins/Managers see ALL notifications
        await pool.query('UPDATE public.notifications SET read = TRUE');
      } else {
        // Regular users only clear their own notifications
        // Ensure dbId is numeric to prevent SQL injection or type errors
        if (!isNaN(Number(dbId))) {
          await pool.query('UPDATE public.notifications SET read = TRUE WHERE user_id = $1 OR user_id IS NULL', [dbId]);
        }
      }
      return true;
    },
    markNotificationAsRead: async (_: any, { id }: { id: string }) => {
      await pool.query('UPDATE public.notifications SET read = TRUE WHERE id = $1', [id]);
      return true;
    },
    markNotificationsListAsRead: async (_: any, { ids }: { ids: string[] }) => {
      if (!ids || ids.length === 0) return true;
      // Use "WHERE id = ANY($1)" for efficient array matching
      await pool.query('UPDATE public.notifications SET read = TRUE WHERE id = ANY($1)', [ids]);
      return true;
    },
    deleteOldNotifications: async () => {
      await cleanOldNotifications();
      return true;
    },
    pardonLate: async (_: any, { userId, date }: { userId: string, date: string }, context: any) => {
      const dateSQL = formatDateLocal(date);
      if (!dateSQL) throw new Error("Invalid date format");
      const monthKey = dateSQL.substring(0, 7).replace('-', '_');
      const tableName = `paiecurrent_${monthKey}`;

      await initializePayrollTable(monthKey);

      let record = (await pool.query(`SELECT * FROM public."${tableName}" WHERE user_id = $1 AND date = $2`, [userId, dateSQL])).rows[0];
      if (!record) {
        await recomputePayrollForDate(dateSQL, userId);
        record = (await pool.query(`SELECT * FROM public."${tableName}" WHERE user_id = $1 AND date = $2`, [userId, dateSQL])).rows[0];
      }
      if (!record) throw new Error("Payroll record not found for this user and date.");

      const scheduleRes = await pool.query('SELECT * FROM public.user_schedules WHERE user_id = $1', [userId]);
      const schedule = scheduleRes.rows[0];
      const userRes = await pool.query('SELECT username, "département" as departement FROM public.users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) throw new Error("User not found");
      const { username, departement } = userRes.rows[0];

      let targetClockIn = record.clock_in;
      let targetClockOut = record.clock_out;

      const isAbsent = record.present === 0;

      if (schedule) {
        const dayOfWeekIndex = new Date(dateSQL + 'T12:00:00').getDay();
        const dayCols = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
        const shiftType = schedule[dayCols[dayOfWeekIndex]] || "Matin";

        if (departement === 'Chef_Cuisine') {
          targetClockIn = "11:00";
          if (isAbsent && !targetClockOut) targetClockOut = "22:00";
        } else {
          if (shiftType === "Soir") {
            targetClockIn = "16:00";
            if (isAbsent && !targetClockOut) targetClockOut = "23:00";
          } else {
            targetClockIn = "07:00";
            if (isAbsent && !targetClockOut) targetClockOut = "16:00";
          }
        }

        // Only override clock_out if user is already finished or if they specifically left early causing issues
        // If Matin shift normally ends at 16:00
        if (isAbsent && shiftType === "Matin" && targetClockOut && targetClockOut < "16:00") {
          targetClockOut = "16:00";
        }
      }

      await pool.query(
        `UPDATE public."${tableName}" 
         SET present = 1, retard = 0, infraction = 0, clock_in = $2, clock_out = $3, remarque = 'Pardonné', updated = TRUE 
         WHERE id = $1`,
        [record.id, targetClockIn, targetClockOut]
      );

      await pool.query('DELETE FROM public.retards WHERE user_id = $1 AND date::date = $2::date', [userId, dateSQL]);
      await pool.query('DELETE FROM public.absents WHERE user_id = $1 AND date::date = $2::date', [userId, dateSQL]);
      await pool.query(`DELETE FROM public.extras WHERE user_id = $1 AND date_extra::date = $2::date AND LOWER(motif) LIKE 'infraction%'`, [userId, dateSQL]);

      const actionType = isAbsent ? "L'absence" : "Le retard";
      await createNotification('system', "Pointage Pardonné", `${actionType} de ${username} pour le ${dateSQL} a été annulé (Pardon).`, userId, context.userDone);
      invalidateCache();

      const final = await pool.query(`SELECT * FROM public."${tableName}" WHERE id = $1`, [record.id]);
      return { ...final.rows[0], date: formatDateLocal(final.rows[0].date) };
    },
    payUser: async (_: any, { month, userId, netSalary }: { month: string, userId: string, netSalary?: number }, context: any) => {
      const tableName = `paiecurrent_${month}`;

      try {
        // 1. Mark all records for this user in this month as paid
        await pool.query(
          `UPDATE public."${tableName}" SET paid = true WHERE user_id = $1`,
          [userId]
        );

        // 2. If netSalary provided, save it to the first record of the month for this user
        if (netSalary !== undefined && netSalary !== null) {
          const firstRecord = await pool.query(
            `SELECT id FROM public."${tableName}" WHERE user_id = $1 ORDER BY date ASC LIMIT 1`,
            [userId]
          );
          if (firstRecord.rows.length > 0) {
            await pool.query(
              `UPDATE public."${tableName}" SET salaire_net = $1 WHERE id = $2`,
              [netSalary, firstRecord.rows[0].id]
            );
          }
        }

        // Get username for notification
        const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [userId]);
        const username = userRes.rows[0]?.username || 'Employé';

        // Create notification
        await createNotification(
          'payment',
          "Paiement Effectué",
          `Le salaire de ${username} pour ${month.replace('_', '/')} a été payé${netSalary ? ` (${netSalary} DT)` : ''}.`,
          userId,
          context.userDone
        );

        invalidateCache();
        return true;
      } catch (error) {
        console.error('Error paying user:', error);
        throw new Error('Failed to mark user as paid');
      }
    },
    unpayUser: async (_: any, { month, userId }: { month: string, userId: string }, context: any) => {
      const tableName = `paiecurrent_${month}`;

      try {
        // 1. Mark all records for this user in this month as NOT paid
        await pool.query(
          `UPDATE public."${tableName}" SET paid = false WHERE user_id = $1`,
          [userId]
        );

        // 2. Reset the frozen net salary to 0 to enable automatic calculation again
        await pool.query(
          `UPDATE public."${tableName}" SET salaire_net = 0 WHERE user_id = $1`,
          [userId]
        );

        // Get username for notification
        const userRes = await pool.query('SELECT username FROM public.users WHERE id = $1', [userId]);
        const username = userRes.rows[0]?.username || 'Employé';

        // Create notification
        await createNotification(
          'payment',
          "Annulation Paiement",
          `Le paiement du salaire de ${username} pour ${month.replace('_', '/')} a été annulé par un administrateur.`,
          userId,
          context.userDone
        );

        invalidateCache();
        return true;
      } catch (error) {
        console.error('Error unpaying user:', error);
        throw new Error('Failed to unmark user as paid');
      }
    },
    updateNbMonth: async (_: any, { userId, nbmonth }: { userId: string, nbmonth: number }) => {
      try {
        await pool.query('UPDATE public.users SET nbmonth = $2 WHERE id = $1', [userId, nbmonth]);
        return true;
      } catch (e) {
        console.error("updateNbMonth error:", e);
        return false;
      }
    }
  },
  User: {
    cin_photo_front: async (parent: any) => {
      const idStr = String(parent.id || "");
      const userId = idStr.includes('-') ? idStr.split('-')[1] : idStr;
      if (!userId || isNaN(Number(userId))) return null;
      const res = await pool.query('SELECT cin_photo_front FROM public.cardcin WHERE user_id = $1', [userId]);
      return res.rows[0]?.cin_photo_front || null;
    },
    cin_photo_back: async (parent: any) => {
      const idStr = String(parent.id || "");
      const userId = idStr.includes('-') ? idStr.split('-')[1] : idStr;
      if (!userId || isNaN(Number(userId))) return null;
      const res = await pool.query('SELECT cin_photo_back FROM public.cardcin WHERE user_id = $1', [userId]);
      return res.rows[0]?.cin_photo_back || null;
    }
  }
};


const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: true,
  formatError: (error) => {
    console.error("GraphQL Error:", error);
    return error;
  },
});

const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req) => {
    return { userDone: req.headers.get("x-user-done") || "Système" };
  }
});

export { handler as GET, handler as POST };
