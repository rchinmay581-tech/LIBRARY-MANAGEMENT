import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock, Search } from 'lucide-react';
import type { BookRecord, EnrichedTransaction, StudentRecord } from '../types.ts';

type DirectoryTab = 'students' | 'books' | 'transactions';

interface DirectoryViewProps {
  mode: DirectoryTab;
  students: StudentRecord[];
  books: BookRecord[];
  transactions: EnrichedTransaction[];
  isLoading: boolean;
  error: string | null;
  onInspectQuery: (query: { usn?: string; bookId?: string; transactionId?: string }) => void;
}

export function DirectoryView({
  mode,
  students,
  books,
  transactions,
  isLoading,
  error,
  onInspectQuery,
}: DirectoryViewProps) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'returned'>('all');

  const query = filterText.trim().toLowerCase();

  const filteredStudents = useMemo(() => {
    if (!query) return students;
    return students.filter(
      (s) =>
        String(s.usn).includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.department.toLowerCase().includes(query),
    );
  }, [students, query]);

  const filteredBooks = useMemo(() => {
    if (!query) return books;
    return books.filter(
      (b) =>
        b.book_id.toLowerCase().includes(query) ||
        b.book_name.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query),
    );
  }, [books, query]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter === 'pending' && tx.return_status.toLowerCase() !== 'pending') {
        return false;
      }
      if (statusFilter === 'returned' && tx.return_status.toLowerCase() !== 'returned') {
        return false;
      }
      if (!query) return true;
      return (
        String(tx.transaction_id).includes(query) ||
        String(tx.usn).includes(query) ||
        tx.book_id.toLowerCase().includes(query) ||
        (tx.student_name?.toLowerCase().includes(query) ?? false) ||
        (tx.book_name?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [transactions, query, statusFilter]);

  const titleMap: Record<DirectoryTab, { title: string; subtitle: string }> = {
    students: {
      title: 'Students Directory',
      subtitle: 'Records from lib_students_db. Select any student to look up their transactions.',
    },
    books: {
      title: 'Books Catalog',
      subtitle: 'Records from lib_books_db. Select any book to view borrowers and transactions.',
    },
    transactions: {
      title: 'Transactions Ledger',
      subtitle: 'Joined records from lib_transactions_db. Select any row to inspect full details.',
    },
  };

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {titleMap[mode].title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{titleMap[mode].subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mode === 'transactions' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'pending', 'returned'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={`Filter ${mode}...`}
              aria-label={`Filter ${mode}`}
              className="h-9 pl-9 pr-3 w-56 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : mode === 'students' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">USN</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    No students match "{filterText}".
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.usn}
                    onClick={() => onInspectQuery({ usn: String(s.usn) })}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-6 font-mono tabular-nums font-medium text-slate-900">
                      {s.usn}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{s.department}</td>
                    <td className="py-2.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : mode === 'books' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">Book ID</th>
                <th className="py-2.5 px-4">Book Title</th>
                <th className="py-2.5 px-4">Author</th>
                <th className="py-2.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    No books match "{filterText}".
                  </td>
                </tr>
              ) : (
                filteredBooks.map((b) => (
                  <tr
                    key={b.book_id}
                    onClick={() => onInspectQuery({ bookId: b.book_id })}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-6 font-mono tabular-nums font-medium text-slate-900">
                      {b.book_id}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{b.book_name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{b.author}</td>
                    <td className="py-2.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">TX ID</th>
                <th className="py-2.5 px-4">USN</th>
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4">Book ID</th>
                <th className="py-2.5 px-4">Book Title</th>
                <th className="py-2.5 px-4">Borrow Status</th>
                <th className="py-2.5 px-6">Return Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No transactions match the active filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    onClick={() =>
                      onInspectQuery({
                        usn: String(tx.usn),
                        bookId: tx.book_id,
                        transactionId: String(tx.transaction_id),
                      })
                    }
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-6 font-mono tabular-nums font-medium text-slate-900">
                      #{tx.transaction_id}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">{tx.usn}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {tx.student_name ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                      {tx.book_id}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{tx.book_name ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-800">{tx.borrow_status}</td>
                    <td className="py-2.5 px-6">
                      {tx.return_status.toLowerCase() === 'returned' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{tx.return_status}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{tx.return_status}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
