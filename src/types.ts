export interface StudentRecord {
  usn: number;
  name: string;
  department: string;
}

export interface BookRecord {
  book_id: string;
  book_name: string;
  author: string;
}

export interface TransactionRecord {
  transaction_id: number;
  usn: number;
  book_id: string;
  borrow_status: string;
  return_status: string;
}

export interface EnrichedTransaction extends TransactionRecord {
  student_name: string | null;
  student_department: string | null;
  book_name: string | null;
  author: string | null;
}

export interface LookupQuery {
  usn: number | null;
  bookId: string | null;
  transactionId: number | null;
}

export interface LookupResponse {
  query: LookupQuery;
  exactMatchFound: boolean;
  matchSummary: string;
  student: StudentRecord | null;
  book: BookRecord | null;
  transaction: EnrichedTransaction | null;
  matchedTransactions: EnrichedTransaction[];
  userTransactions: EnrichedTransaction[];
  bookTransactions: EnrichedTransaction[];
}

export interface HealthResponse {
  configured: boolean;
  connected: boolean;
  databases: {
    students: boolean;
    books: boolean;
    transactions: boolean;
  };
  counts: {
    students: number;
    books: number;
    transactions: number;
  };
  error?: string;
}
