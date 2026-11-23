import { Pool } from 'pg';
import type {
  BookRecord,
  EnrichedTransaction,
  HealthResponse,
  LookupQuery,
  LookupResponse,
  StudentRecord,
  TransactionRecord,
} from '../src/types.ts';

interface DbPools {
  students: Pool;
  books: Pool;
  transactions: Pool;
}

let cachedKey: string | null = null;
let cachedPools: DbPools | null = null;

function buildDbConnectionString(baseUri: string, dbName: string): string {
  const parsed = new URL(baseUri);
  parsed.pathname = `/${dbName}`;
  parsed.searchParams.delete('sslmode');
  return parsed.toString();
}

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function isDatabaseConfigured(): boolean {
  const baseUri = process.env.DATABASE_URL?.trim();
  const hasSeparate =
    Boolean(process.env.STUDENTS_DB_URL?.trim()) &&
    Boolean(process.env.BOOKS_DB_URL?.trim()) &&
    Boolean(process.env.TRANSACTIONS_DB_URL?.trim());
  return Boolean(baseUri || hasSeparate);
}

export function getPools(): DbPools {
  const baseUri = process.env.DATABASE_URL?.trim() || '';
  const studentsUri = process.env.STUDENTS_DB_URL?.trim() || (baseUri ? buildDbConnectionString(baseUri, 'lib_students_db') : '');
  const booksUri = process.env.BOOKS_DB_URL?.trim() || (baseUri ? buildDbConnectionString(baseUri, 'lib_books_db') : '');
  const transactionsUri = process.env.TRANSACTIONS_DB_URL?.trim() || (baseUri ? buildDbConnectionString(baseUri, 'lib_transactions_db') : '');

  if (!studentsUri || !booksUri || !transactionsUri) {
    throw new Error('DATABASE_URL is not configured in server environment.');
  }

  const key = `${studentsUri}|${booksUri}|${transactionsUri}`;
  if (cachedPools && cachedKey === key) {
    return cachedPools;
  }

  if (cachedPools) {
    void cachedPools.students.end().catch(() => undefined);
    void cachedPools.books.end().catch(() => undefined);
    void cachedPools.transactions.end().catch(() => undefined);
  }

  cachedPools = {
    students: createPool(studentsUri),
    books: createPool(booksUri),
    transactions: createPool(transactionsUri),
  };
  cachedKey = key;
  return cachedPools;
}

async function enrichTransactions(
  transactions: TransactionRecord[],
  pools: DbPools,
): Promise<EnrichedTransaction[]> {
  if (transactions.length === 0) {
    return [];
  }

  const usns = Array.from(new Set(transactions.map((t) => t.usn)));
  const bookIds = Array.from(new Set(transactions.map((t) => t.book_id.toUpperCase())));

  const [studentsRes, booksRes] = await Promise.all([
    pools.students.query<StudentRecord>(
      'SELECT usn, name, department FROM students WHERE usn = ANY($1::int[])',
      [usns],
    ),
    pools.books.query<BookRecord>(
      'SELECT book_id, book_name, author FROM books WHERE UPPER(book_id) = ANY($1::text[])',
      [bookIds],
    ),
  ]);

  const studentMap = new Map<number, StudentRecord>();
  for (const s of studentsRes.rows) {
    studentMap.set(s.usn, s);
  }

  const bookMap = new Map<string, BookRecord>();
  for (const b of booksRes.rows) {
    bookMap.set(b.book_id.toUpperCase(), b);
  }

  return transactions.map((tx) => {
    const student = studentMap.get(tx.usn) ?? null;
    const book = bookMap.get(tx.book_id.toUpperCase()) ?? null;
    return {
      ...tx,
      student_name: student?.name ?? null,
      student_department: student?.department ?? null,
      book_name: book?.book_name ?? null,
      author: book?.author ?? null,
    };
  });
}

export async function getHealthStatus(): Promise<HealthResponse> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      databases: { students: false, books: false, transactions: false },
      counts: { students: 0, books: 0, transactions: 0 },
      error: 'DATABASE_URL environment variable is not configured.',
    };
  }

  try {
    const pools = getPools();
    const [studentsCount, booksCount, txCount] = await Promise.all([
      pools.students.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM students'),
      pools.books.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM books'),
      pools.transactions.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM transactions'),
    ]);

    return {
      configured: true,
      connected: true,
      databases: { students: true, books: true, transactions: true },
      counts: {
        students: Number(studentsCount.rows[0]?.count ?? 0),
        books: Number(booksCount.rows[0]?.count ?? 0),
        transactions: Number(txCount.rows[0]?.count ?? 0),
      },
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      databases: { students: false, books: false, transactions: false },
      counts: { students: 0, books: 0, transactions: 0 },
      error: err instanceof Error ? err.message : 'Unable to connect to PostgreSQL cluster.',
    };
  }
}

export async function listStudents(): Promise<StudentRecord[]> {
  const pools = getPools();
  const res = await pools.students.query<StudentRecord>(
    'SELECT usn, name, department FROM students ORDER BY usn ASC',
  );
  return res.rows;
}

export async function listBooks(): Promise<BookRecord[]> {
  const pools = getPools();
  const res = await pools.books.query<BookRecord>(
    'SELECT book_id, book_name, author FROM books ORDER BY book_id ASC',
  );
  return res.rows;
}

export async function listTransactions(): Promise<EnrichedTransaction[]> {
  const pools = getPools();
  const res = await pools.transactions.query<TransactionRecord>(
    'SELECT transaction_id, usn, book_id, borrow_status, return_status FROM transactions ORDER BY transaction_id ASC',
  );
  return enrichTransactions(res.rows, pools);
}

export async function lookupRecords(query: LookupQuery): Promise<LookupResponse> {
  const pools = getPools();
  const { usn, bookId, transactionId } = query;

  const conditions: string[] = [];
  const params: Array<number | string> = [];

  if (usn !== null) {
    params.push(usn);
    conditions.push(`usn = $${params.length}`);
  }
  if (bookId !== null) {
    params.push(bookId);
    conditions.push(`UPPER(book_id) = UPPER($${params.length})`);
  }
  if (transactionId !== null) {
    params.push(transactionId);
    conditions.push(`transaction_id = $${params.length}`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const txRes = await pools.transactions.query<TransactionRecord>(
    `SELECT transaction_id, usn, book_id, borrow_status, return_status
     FROM transactions
     ${whereSql}
     ORDER BY transaction_id ASC`,
    params,
  );

  const matchedTransactions = await enrichTransactions(txRes.rows, pools);
  const primaryTransaction = matchedTransactions[0] ?? null;

  // Determine the target USN and Book ID for individual entity cards
  const resolvedUsn = usn ?? primaryTransaction?.usn ?? null;
  const resolvedBookId = bookId ?? primaryTransaction?.book_id ?? null;

  const [studentRes, bookRes, userTxRaw, bookTxRaw] = await Promise.all([
    resolvedUsn !== null
      ? pools.students.query<StudentRecord>(
          'SELECT usn, name, department FROM students WHERE usn = $1',
          [resolvedUsn],
        )
      : Promise.resolve({ rows: [] as StudentRecord[] }),
    resolvedBookId !== null
      ? pools.books.query<BookRecord>(
          'SELECT book_id, book_name, author FROM books WHERE UPPER(book_id) = UPPER($1)',
          [resolvedBookId],
        )
      : Promise.resolve({ rows: [] as BookRecord[] }),
    resolvedUsn !== null
      ? pools.transactions.query<TransactionRecord>(
          'SELECT transaction_id, usn, book_id, borrow_status, return_status FROM transactions WHERE usn = $1 ORDER BY transaction_id ASC',
          [resolvedUsn],
        )
      : Promise.resolve({ rows: [] as TransactionRecord[] }),
    resolvedBookId !== null
      ? pools.transactions.query<TransactionRecord>(
          'SELECT transaction_id, usn, book_id, borrow_status, return_status FROM transactions WHERE UPPER(book_id) = UPPER($1) ORDER BY transaction_id ASC',
          [resolvedBookId],
        )
      : Promise.resolve({ rows: [] as TransactionRecord[] }),
  ]);

  const student = studentRes.rows[0] ?? null;
  const book = bookRes.rows[0] ?? null;

  // If no exact combined transaction matched, fetch the entered transactionId individually so the user still sees its details
  let transaction: EnrichedTransaction | null = primaryTransaction;
  if (!transaction && transactionId !== null) {
    const singleTxRes = await pools.transactions.query<TransactionRecord>(
      'SELECT transaction_id, usn, book_id, borrow_status, return_status FROM transactions WHERE transaction_id = $1',
      [transactionId],
    );
    const enrichedSingle = await enrichTransactions(singleTxRes.rows, pools);
    transaction = enrichedSingle[0] ?? null;
  }

  const [userTransactions, bookTransactions] = await Promise.all([
    enrichTransactions(userTxRaw.rows, pools),
    enrichTransactions(bookTxRaw.rows, pools),
  ]);

  const exactMatchFound = matchedTransactions.length > 0;
  let matchSummary = '';

  if (exactMatchFound) {
    const label = student ? `${student.name} (USN ${student.usn})` : `USN ${primaryTransaction.usn}`;
    if (matchedTransactions.length === 1) {
      matchSummary = `Matched transaction #${primaryTransaction.transaction_id} for ${label} and book ${primaryTransaction.book_id}.`;
    } else {
      matchSummary = `Found ${matchedTransactions.length} matching transactions for ${label}.`;
    }
  } else if (student || book || transaction) {
    matchSummary =
      'No single transaction matches all entered filters simultaneously. Individual records found for your inputs are shown below.';
  } else {
    matchSummary = 'No student, book, or transaction records matched the entered criteria.';
  }

  return {
    query,
    exactMatchFound,
    matchSummary,
    student,
    book,
    transaction,
    matchedTransactions,
    userTransactions,
    bookTransactions,
  };
}
