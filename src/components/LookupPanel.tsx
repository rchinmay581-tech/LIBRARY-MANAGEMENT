import React from 'react';
import { BookOpen, Hash, ReceiptText, RotateCcw, Search } from 'lucide-react';

interface LookupPanelProps {
  usnInput: string;
  bookIdInput: string;
  transactionIdInput: string;
  onUsnChange: (val: string) => void;
  onBookIdChange: (val: string) => void;
  onTransactionIdChange: (val: string) => void;
  onSearch: (overrides?: { usn?: string; bookId?: string; transactionId?: string }) => void;
  onClear: () => void;
  isLoading: boolean;
  disabled: boolean;
}

const SAMPLE_PRESETS = [
  { label: 'USN 1 · B101 · TX 1', usn: '1', bookId: 'B101', transactionId: '1' },
  { label: 'USN 2 · B102 · TX 2', usn: '2', bookId: 'B102', transactionId: '2' },
  { label: 'USN 5 · B105 · TX 5', usn: '5', bookId: 'B105', transactionId: '5' },
];

export function LookupPanel({
  usnInput,
  bookIdInput,
  transactionIdInput,
  onUsnChange,
  onBookIdChange,
  onTransactionIdChange,
  onSearch,
  onClear,
  isLoading,
  disabled,
}: LookupPanelProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const hasAnyInput =
    usnInput.trim() !== '' || bookIdInput.trim() !== '' || transactionIdInput.trim() !== '';

  return (
    <section
      aria-labelledby="lookup-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 border-b border-slate-100">
        <div>
          <h1
            id="lookup-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            Record Lookup
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Enter a USN, Book ID, and Transaction ID—or any single identifier—to inspect linked student, book, and borrowing details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="usn-input"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
            >
              <Hash className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Student USN</span>
            </label>
            <input
              id="usn-input"
              type="text"
              inputMode="numeric"
              value={usnInput}
              onChange={(e) => onUsnChange(e.target.value)}
              placeholder="e.g. 1"
              disabled={disabled}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="book-id-input"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Book ID</span>
            </label>
            <input
              id="book-id-input"
              type="text"
              value={bookIdInput}
              onChange={(e) => onBookIdChange(e.target.value)}
              placeholder="e.g. B101"
              disabled={disabled}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono uppercase tabular-nums text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="tx-id-input"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"
            >
              <ReceiptText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Transaction ID</span>
            </label>
            <input
              id="tx-id-input"
              type="text"
              inputMode="numeric"
              value={transactionIdInput}
              onChange={(e) => onTransactionIdChange(e.target.value)}
              placeholder="e.g. 1"
              disabled={disabled}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Quick examples:</span>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={disabled || isLoading}
                onClick={() => {
                  onUsnChange(preset.usn);
                  onBookIdChange(preset.bookId);
                  onTransactionIdChange(preset.transactionId);
                  onSearch({
                    usn: preset.usn,
                    bookId: preset.bookId,
                    transactionId: preset.transactionId,
                  });
                }}
                className="px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {hasAnyInput && (
              <button
                type="button"
                onClick={onClear}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="submit"
              disabled={disabled || isLoading || !hasAnyInput}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>{isLoading ? 'Searching...' : 'Search Records'}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
