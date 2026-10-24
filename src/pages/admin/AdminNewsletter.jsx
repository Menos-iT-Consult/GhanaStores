/**
 * DiDwa - Super admin newsletter (bulk email/SMS).
 *
 * Allows admins to send a newsletter or SMS to selected customers.
 * Uses the existing customer data (email, phone) from the admin customers list.
 */
import { useState, useCallback } from 'react';
import { adminApi } from '../../api.js';
import {
  Button, Panel, PageHeader, Toolbar, DataTable, EmptyState, ErrorBanner,
  LoadingBlock,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

export default function AdminNewsletter() {
  const customers = useAdminList('/api/admin/customers', { params: { rowsKey: 'customers' } });
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState(null);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const sendNewsletter = useCallback(async () => {
    if (!message.trim()) {
      setSendError('Message is required.');
      return;
    }
    if (recipientType === 'selected' && selectedIds.size === 0) {
      setSendError('Please select at least one customer.');
      return;
    }

    setSending(true);
    setSendError('');
    setSendResult(null);

    try {
      const body = {
        subject: subject.trim(),
        message: message.trim(),
        recipientType,
        customerIds: recipientType === 'selected' ? Array.from(selectedIds) : [],
      };

      const json = await adminApi.post('/api/admin/newsletter/send', body);

      setSendResult(json);
      setSubject('');
      setMessage('');
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err.message || 'Failed to send newsletter.';
      setSendError(msg);
      console.error('Newsletter send error:', err);
    } finally {
      setSending(false);
    }
  }, [subject, message, recipientType, selectedIds]);

  return (
    <>
      <PageHeader
        title="Newsletter / Bulk SMS"
        subtitle="Send emails or SMS to customers"
      />
      <Panel>
        <Toolbar
          term={customers.term}
          onTerm={customers.setTerm}
          placeholder="Search name, phone, email or merchant..."
        />
        {customers.error ? (
          <div className="p-5"><ErrorBanner error={customers.error} onRetry={customers.reload} /></div>
        ) : (
          customers.loading ? (
            <LoadingBlock label="Loading customers..." />
          ) : (
            <>
              <DataTable
                rows={customers.rows}
                columns={[
                  {
                    key: 'name',
                    label: 'Customer',
                    render: (row) => (
                      <span className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggleSelection(row.id)}>
                        <input
                          type="checkbox"
                          checked={isSelected(row.id)}
                          className="form-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {row.name || 'Unnamed'}
                      </span>
                    ),
                  },
                  { key: 'phone', label: 'Phone' },
                  { key: 'storeName', label: 'Merchant' },
                  { key: 'email', label: 'Email' },
                ]}
                onRowClick={(row) => toggleSelection(row.id)}
              />
              {selectedIds.size > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  {selectedIds.size} customer{selectedIds.size === 1 ? '' : 's'} selected
                </div>
              )}
            </>
          )
        )}
      </Panel>
      <Panel className="mt-8">
        <PageHeader title="Create Newsletter" subtitle="Send to all customers or selected recipients" />
        <Panel className="mt-6 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Newsletter subject or SMS text preview"
                disabled={sending}
              />
              <p className="text-[11px] text-slate-400 mt-1">Required for email newsletters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message / SMS Text</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded border px-3 py-1.5 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={sending}
                placeholder="Enter newsletter content or SMS message"
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 radio">
                <input
                  type="radio"
                  value="all"
                  checked={recipientType === 'all'}
                  onChange={() => setRecipientType('all')}
                  className="peer cursor-pointer"
                  disabled={sending}
                />
                <span className="text-sm font-medium">Send to all customers</span>
              </label>
              <label className="flex items-center gap-2 radio">
                <input
                  type="radio"
                  value="selected"
                  checked={recipientType === 'selected'}
                  onChange={() => setRecipientType('selected')}
                  className="peer cursor-pointer"
                  disabled={sending}
                />
                <span className="text-sm font-medium">Send to selected customers ({selectedIds.size})</span>
              </label>
            </div>
            {sendError && (
              <div className="mt-3 p-3 rounded bg-red-100 text-red-800 text-sm">{sendError}</div>
            )}
            {sendResult && (
              <div className="mt-3 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                {sendResult.message}
              </div>
            )}
            <Button
              tone="primary"
              size="lg"
              block
              disabled={
                sending ||
                !message.trim() ||
                (recipientType === 'selected' && selectedIds.size === 0)
              }
              onClick={sendNewsletter}
            >
              {sending ? 'Sending...' : 'Send Newsletter / SMS'}
            </Button>
          </div>
        </Panel>
      </Panel>
    </>
  );
}