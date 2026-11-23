import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Database,
  Menu,
  ReceiptText,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { DirectoryView } from './components/DirectoryView.tsx';
import { LookupPanel } from './components/LookupPanel.tsx';
import { LookupResults } from './components/LookupResults.tsx';
import type {
  BookRecord,
  EnrichedTransaction,
  HealthResponse,
  LookupResponse,
  StudentRecord,
} from './types.ts';

type ActiveView = 'lookup' | 'students' | 'books' | 'transactions';

const NAV_ITEMS: Array<{
  id: ActiveView;
  label: string;
  icon: typeof Search;
  breadcrumb: string;
}> = [
  { id: 'lookup', label: 'Record Lookup', icon: Search, breadcrumb: 'Record Lookup' },
  { id: 'students', label: 'Students', icon: Users, breadcrumb: 'Students Directory' },
  { id: 'books', label: 'Books', icon: BookOpen, breadcrumb: 'Books Catalog' },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText, breadcrumb: 'Transactions Ledger' },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('lookup');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [usnInput, setUsnInput] = useState('');
  const [bookIdInput, setBookIdInput] = useState('');
  const [transactionIdInput, setTransactionIdInput] = useState('');

  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
    } catch {
      setHealth({
        configured: false,
        connected: false,
        databases: { students: false, books: false, transactions: false },
        counts: { students: 0, books: 0, transactions: 0 },
        error: 'Unable to reach backend server.',
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchDirectoryData = useCallback(async (tab: Exclude<ActiveView, 'lookup'>) => {
    setDirectoryLoading(true);
    setDirectoryError(null);
    try {
      const res = await fetch(`/api/${tab}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to load ${tab}.`);
      }
      if (tab === 'students') setStudents(data.students);
      if (tab === 'books') setBooks(data.books);
      if (tab === 'transactions') setTransactions(data.transactions);
    } catch (err) {
      setDirectoryError(err instanceof Error ? err.message : 'Unable to load directory records.');
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (activeView !== 'lookup' && health?.connected) {
      void fetchDirectoryData(activeView);
    }
  }, [activeView, health?.connected, fetchDirectoryData]);

  const runLookup = useCallback(
    async (overrides?: { usn?: string; bookId?: string; transactionId?: string }) => {
      const usn = (overrides?.usn ?? usnInput).trim();
      const bookId = (overrides?.bookId ?? bookIdInput).trim();
      const transactionId = (overrides?.transactionId ?? transactionIdInput).trim();

      if (!usn && !bookId && !transactionId) {
        setLookupError('Enter at least one identifier (USN, Book ID, or Transaction ID).');
        return;
      }

      setLookupLoading(true);
      setLookupError(null);

      try {
        const params = new URLSearchParams();
        if (usn) params.set('usn', usn);
        if (bookId) params.set('bookId', bookId);
        if (transactionId) params.set('transactionId', transactionId);

        const res = await fetch(`/api/lookup?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Lookup request failed.');
        }
        setLookupResult(data as LookupResponse);
      } catch (err) {
        setLookupError(err instanceof Error ? err.message : 'Lookup request failed.');
        setLookupResult(null);
      } finally {
        setLookupLoading(false);
      }
    },
    [usnInput, bookIdInput, transactionIdInput],
  );

  const handleInspectFromDirectory = useCallback(
    (query: { usn?: string; bookId?: string; transactionId?: string }) => {
      const nextUsn = query.usn ?? '';
      const nextBookId = query.bookId ?? '';
      const nextTxId = query.transactionId ?? '';
      setUsnInput(nextUsn);
      setBookIdInput(nextBookId);
      setTransactionIdInput(nextTxId);
      setActiveView('lookup');
      void runLookup({ usn: nextUsn, bookId: nextBookId, transactionId: nextTxId });
    },
    [runLookup],
  );

  const handleClear = useCallback(() => {
    setUsnInput('');
    setBookIdInput('');
    setTransactionIdInput('');
    setLookupResult(null);
    setLookupError(null);
  }, []);

  const handleRefresh = useCallback(() => {
    void fetchHealth();
    if (activeView !== 'lookup') {
      void fetchDirectoryData(activeView);
    } else if (usnInput.trim() || bookIdInput.trim() || transactionIdInput.trim()) {
      void runLookup();
    }
  }, [activeView, fetchDirectoryData, fetchHealth, runLookup, usnInput, bookIdInput, transactionIdInput]);

  const currentBreadcrumb =
    NAV_ITEMS.find((item) => item.id === activeView)?.breadcrumb ?? 'Record Lookup';

  const dbUnavailable = !healthLoading && health !== null && (!health.configured || !health.connected);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Library Ledger
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {health?.connected && item.id !== 'lookup' && (
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {health.counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>PostgreSQL Cluster</span>
          </div>
          <p className="leading-relaxed">
            {healthLoading
              ? 'Checking cluster connection...'
              : health?.connected
                ? `Connected to students (${health.counts.students}), books (${health.counts.books}), and transactions (${health.counts.transactions}).`
                : health?.configured
                  ? 'Connection failed. Verify DATABASE_URL.'
                  : 'Waiting for DATABASE_URL secret.'}
          </p>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                Library Ledger
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-900 whitespace-nowrap">Library Registry</span>
              <span aria-hidden="true">/</span>
              <span className="truncate">{currentBreadcrumb}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh Data</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {dbUnavailable && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-950"
            >
              <AlertTriangle
                className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  {health?.configured
                    ? 'Database connection error'
                    : 'PostgreSQL secret not configured'}
                </p>
                <p className="mt-1 text-amber-900">
                  {health?.configured
                    ? health.error
                    : 'Set the DATABASE_URL secret in Settings -> Secrets to your Aiven PostgreSQL service URI so the server can query lib_students_db, lib_books_db, and lib_transactions_db.'}
                </p>
              </div>
            </div>
          )}

          {activeView === 'lookup' ? (
            <>
              <LookupPanel
                usnInput={usnInput}
                bookIdInput={bookIdInput}
                transactionIdInput={transactionIdInput}
                onUsnChange={setUsnInput}
                onBookIdChange={setBookIdInput}
                onTransactionIdChange={setTransactionIdInput}
                onSearch={runLookup}
                onClear={handleClear}
                isLoading={lookupLoading}
                disabled={dbUnavailable}
              />
              <LookupResults
                result={lookupResult}
                isLoading={lookupLoading}
                error={lookupError}
                onSelectTransaction={(tx) => {
                  const nextUsn = String(tx.usn);
                  const nextBookId = tx.book_id;
                  const nextTxId = String(tx.transaction_id);
                  setUsnInput(nextUsn);
                  setBookIdInput(nextBookId);
                  setTransactionIdInput(nextTxId);
                  void runLookup({
                    usn: nextUsn,
                    bookId: nextBookId,
                    transactionId: nextTxId,
                  });
                }}
              />
            </>
          ) : (
            <DirectoryView
              mode={activeView}
              students={students}
              books={books}
              transactions={transactions}
              isLoading={directoryLoading}
              error={directoryError}
              onInspectQuery={handleInspectFromDirectory}
            />
          )}
        </main>
      </div>
    </div>
  );
}
