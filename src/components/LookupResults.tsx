import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ReceiptText,
  SearchX,
  User,
} from 'lucide-react';
import type { EnrichedTransaction, LookupResponse } from '../types.ts';

interface LookupResultsProps {
  result: LookupResponse | null;
  isLoading: boolean;
  error: string | null;
  onSelectTransaction: (tx: EnrichedTransaction) => void;
}

function StatusText({ status, type }: { status: string; type: 'borrow' | 'return' }) {
  const normalized = status.trim().toLowerCase();
  if (type === 'return') {
    if (normalized === 'returned') {
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
      <span>{status}</span>
    </span>
  );
}

export function LookupResults({
  result,
  isLoading,
  error,
  onSelectTransaction,
}: LookupResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading search results">
        <div className="h-14 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
      >
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-medium text-red-900">Lookup failed</p>
          <p className="mt-0.5 text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <div className="mx-auto w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
          <ReceiptText className="w-5 h-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          Ready to Query Library Records
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 max-w-lg mx-auto">
          Enter a student USN, Book ID, and Transaction ID above—or pick one of the quick examples—to fetch joined student, book, and transaction details across all three PostgreSQL databases.
        </p>
      </div>
    );
  }

  const { exactMatchFound, matchSummary, student, book, transaction, userTransactions, bookTransactions } =
    result;
  const hasAnyEntity = Boolean(student || book || transaction);

  return (
    <div className="space-y-6">
      <div
        className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm ${
          exactMatchFound
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : hasAnyEntity
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {exactMatchFound ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
        ) : hasAnyEntity ? (
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <SearchX className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          <p className="font-medium">{matchSummary}</p>
          <p className="text-xs opacity-80 mt-0.5">
            Query parameters: USN {result.query.usn ?? 'Any'} · Book ID {result.query.bookId ?? 'Any'} · Transaction ID{' '}
            {result.query.transactionId ?? 'Any'}
          </p>
        </div>
      </div>

      {hasAnyEntity && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Student Details */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">Student Details</h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">lib_students_db</span>
            </div>
            {student ? (
              <dl className="divide-y divide-slate-100">
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">USN</dt>
                  <dd className="text-sm font-mono font-semibold tabular-nums text-slate-900">
                    {student.usn}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Full Name</dt>
                  <dd className="text-sm font-medium text-slate-900 text-right">{student.name}</dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Department</dt>
                  <dd className="text-sm font-medium text-slate-900 text-right">
                    {student.department}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="px-5 py-8 text-sm text-slate-500 text-center">
                No matching student record found.
              </div>
            )}
          </section>

          {/* Book Details */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">Book Details</h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">lib_books_db</span>
            </div>
            {book ? (
              <dl className="divide-y divide-slate-100">
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Book ID</dt>
                  <dd className="text-sm font-mono font-semibold tabular-nums text-slate-900">
                    {book.book_id}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Book Title</dt>
                  <dd className="text-sm font-medium text-slate-900 text-right">
                    {book.book_name}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Author</dt>
                  <dd className="text-sm font-medium text-slate-900 text-right">{book.author}</dd>
                </div>
              </dl>
            ) : (
              <div className="px-5 py-8 text-sm text-slate-500 text-center">
                No matching book record found.
              </div>
            )}
          </section>

          {/* Transaction Details */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-blue-700" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">Transaction Details</h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">lib_transactions_db</span>
            </div>
            {transaction ? (
              <dl className="divide-y divide-slate-100">
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Transaction ID</dt>
                  <dd className="text-sm font-mono font-semibold tabular-nums text-slate-900">
                    #{transaction.transaction_id}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Linked USN / Book</dt>
                  <dd className="text-sm font-mono tabular-nums text-slate-800">
                    USN {transaction.usn} · {transaction.book_id}
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Borrow Status</dt>
                  <dd>
                    <StatusText status={transaction.borrow_status} type="borrow" />
                  </dd>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-4">
                  <dt className="text-xs text-slate-500">Return Status</dt>
                  <dd>
                    <StatusText status={transaction.return_status} type="return" />
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="px-5 py-8 text-sm text-slate-500 text-center">
                No matching transaction record found.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Associated User Transactions Table */}
      {student && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                All Transactions Associated with {student.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                USN {student.usn} · {student.department} · {userTransactions.length} total{' '}
                {userTransactions.length === 1 ? 'record' : 'records'}
              </p>
            </div>
          </div>

          {userTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-5">Transaction ID</th>
                    <th className="py-2.5 px-4">Book ID</th>
                    <th className="py-2.5 px-4">Book Title</th>
                    <th className="py-2.5 px-4">Author</th>
                    <th className="py-2.5 px-4">Borrow Status</th>
                    <th className="py-2.5 px-5">Return Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {userTransactions.map((tx) => {
                    const isHighlighted =
                      transaction?.transaction_id === tx.transaction_id;
                    return (
                      <tr
                        key={tx.transaction_id}
                        onClick={() => onSelectTransaction(tx)}
                        className={`cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-blue-50/60 hover:bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-5 font-mono tabular-nums font-medium text-slate-900">
                          #{tx.transaction_id}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                          {tx.book_id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {tx.book_name ?? 'Unknown Book'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{tx.author ?? '—'}</td>
                        <td className="py-3 px-4">
                          <StatusText status={tx.borrow_status} type="borrow" />
                        </td>
                        <td className="py-3 px-5">
                          <StatusText status={tx.return_status} type="return" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500 text-center">
              No transactions recorded for USN {student.usn}.
            </div>
          )}
        </section>
      )}

      {/* Book Transactions when no student was resolved or book has different borrowers */}
      {book && bookTransactions.length > 0 && !student && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Transactions Associated with Book {book.book_id}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {book.book_name} · {book.author}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">Transaction ID</th>
                  <th className="py-2.5 px-4">USN</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Borrow Status</th>
                  <th className="py-2.5 px-5">Return Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {bookTransactions.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    onClick={() => onSelectTransaction(tx)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-5 font-mono tabular-nums font-medium text-slate-900">
                      #{tx.transaction_id}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-800">{tx.usn}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {tx.student_name ?? 'Unknown Student'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{tx.student_department ?? '—'}</td>
                    <td className="py-3 px-4">
                      <StatusText status={tx.borrow_status} type="borrow" />
                    </td>
                    <td className="py-3 px-5">
                      <StatusText status={tx.return_status} type="return" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
