import { useState, useCallback } from 'react';
import { adminApi } from '../../api.js';
import {
  Button, Panel, PageHeader, Toolbar, DataTable, EmptyState, ErrorBanner,
  LoadingBlock,
  Input, Textarea, Label, Alert, Select,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

export default function AdminNewsletter() {
  const merchants = useAdminList('/api/admin/merchants', { params: { rowsKey: 'merchants' }, limit: 100 });
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const customers = useAdminList('/api/admin/customers', {
    params: { rowsKey: 'customers', storeId: selectedStoreId },
    limit: 100,
    enabled: Boolean(selectedStoreId),
  });

  /* ---- Email newsletter state ---- */
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailRecipientType, setEmailRecipientType] = useState('all');
  const [emailSelectedIds, setEmailSelectedIds] = useState(new Set());
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendError, setEmailSendError] = useState('');
  const [emailSendResult, setEmailSendResult] = useState(null);

  /* ---- SMS newsletter state ---- */
  const [smsMessage, setSmsMessage] = useState('');
  const [smsRecipientType, setSmsRecipientType] = useState('all');
  const [smsSelectedIds, setSmsSelectedIds] = useState(new Set());
  const [smsSending, setSmsSending] = useState(false);
  const [smsSendError, setSmsSendError] = useState('');
  const [smsSendResult, setSmsSendResult] = useState(null);


  const merchantOptions = merchants.rows.map((m) => ({
    value: m.id,
    label: m.name || m.slug || 'Unnamed',
  }));

  /* ---- Email helpers ---- */
  const toggleEmailSelection = useCallback((id) => {
    setEmailSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isEmailSelected = useCallback((id) => emailSelectedIds.has(id), [emailSelectedIds]);
  const emailHasRecipients = emailRecipientType === 'all' || emailSelectedIds.size > 0;

  const sendEmailNewsletter = useCallback(async () => {
    if (!emailSubject.trim()) {
      setEmailSendError('Subject is required for email newsletters.');
      return;
    }
    if (!emailMessage.trim()) {
      setEmailSendError('Message is required.');
      return;
    }
    if (!emailHasRecipients) {
      setEmailSendError('Please select recipients.');
      return;
    }
    setEmailSending(true);
    setEmailSendError('');
    setEmailSendResult(null);
    try {
      const json = await adminApi.post('/api/admin/newsletter/send-email', {
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
        recipientType: emailRecipientType,
        customerIds: emailRecipientType === 'selected' ? Array.from(emailSelectedIds) : [],
        storeId: selectedStoreId,
      });
      setEmailSendResult(json);
      setEmailSubject('');
      setEmailMessage('');
      setEmailSelectedIds(new Set());
    } catch (err) {
      setEmailSendError(err.message || 'Failed to send email newsletter.');
      console.error('Newsletter send error:', err);
    } finally {
      setEmailSending(false);
    }
  }, [emailSubject, emailMessage, emailRecipientType, emailSelectedIds, selectedStoreId]);

  /* ---- SMS helpers ---- */
  const toggleSmsSelection = useCallback((id) => {
    setSmsSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSmsSelected = useCallback((id) => smsSelectedIds.has(id), [smsSelectedIds]);
  const smsHasRecipients = smsRecipientType === 'all' || smsSelectedIds.size > 0;
  const smsCharCount = smsMessage.length;
  const smsSegments = Math.ceil(smsCharCount / 160);

  const sendSmsNewsletter = useCallback(async () => {
    if (!smsMessage.trim()) {
      setSmsSendError('Message is required.');
      return;
    }
    if (!smsHasRecipients) {
      setSmsSendError('Please select recipients.');
      return;
    }
    setSmsSending(true);
    setSmsSendError('');
    setSmsSendResult(null);
    try {
      const json = await adminApi.post('/api/admin/newsletter/send-sms', {
        message: smsMessage.trim(),
        recipientType: smsRecipientType,
        customerIds: smsRecipientType === 'selected' ? Array.from(smsSelectedIds) : [],
        storeId: selectedStoreId,
      });
      setSmsSendResult(json);
      setSmsMessage('');
      setSmsSelectedIds(new Set());
    } catch (err) {
      setSmsSendError(err.message || 'Failed to send SMS.');
      console.error('SMS send error:', err);
    } finally {
      setSmsSending(false);
    }
  }, [smsMessage, smsRecipientType, smsSelectedIds, selectedStoreId]);

  return (
    <>
      <PageHeader
        title='Newsletter'
        subtitle='Email and SMS campaigns'
      />

      <Panel className='mt-6'>
        <PageHeader title='Choose Merchant' subtitle='Send newsletters to customers of a specific merchant' />
        <Panel className='mt-6 p-6'>
          <div className='space-y-4'>
            <div>
              <Label>Merchant</Label>
              <Select
                value={selectedStoreId || ''}
                onChange={setSelectedStoreId}
                placeholder='Select a merchant...'
                options={[{ value: '', label: 'Select a merchant...' }, ...merchantOptions]}
                disabled={merchants.loading}
              />
              {merchants.error && (
                <Alert tone='danger' className='mt-2'>{merchants.error}</Alert>
              )}
            </div>
            {!selectedStoreId && (
              <Alert tone='warning'>
                Select a merchant to see their customers and send newsletters or SMS.
              </Alert>
            )}
          </div>
        </Panel>
      </Panel>

      {selectedStoreId ? (
        <>
      <Panel className='drop-shadow-sm'>
        <PageHeader
          title='Email Newsletter'
          subtitle='Send email campaigns to customers with email addresses'
        />
        <Panel className='mt-6 p-6'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>Subject (required)</label>
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder='Hello {{name}}, ...'
                disabled={emailSending}
              />
            </div>
            <div>
              <label className='block text-sm font-medium mb-2'>Message</label>
              <Textarea
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
                placeholder='Welcome to DiDwa! ...'
                rows={6}
                disabled={emailSending}
              />
            </div>
            <div className='flex items-center gap-3'>
              <fieldset disabled={emailSending} className='flex flex-wrap gap-4'>
                <Label className='flex items-center gap-2'>
                  <input
                    type='radio'
                    name='emailRecipientType'
                    value='all'
                    checked={emailRecipientType === 'all'}
                    onChange={(e) => setEmailRecipientType(e.target.value)}
                    className='peer cursor-pointer'
                  />
                  <span className='text-sm font-medium'>Send to all customers</span>
                </Label>
                <Label className='flex items-center gap-2'>
                  <input
                    type='radio'
                    name='emailRecipientType'
                    value='selected'
                    checked={emailRecipientType === 'selected'}
                    onChange={(e) => setEmailRecipientType(e.target.value)}
                    className='peer cursor-pointer'
                  />
                  <span className='text-sm font-medium'>Send to selected customers</span>
                </Label>
              </fieldset>
            </div>
            {!emailHasRecipients && (
              <Alert tone='warning' className='mt-2'>
                No recipients selected. Please select customers from the table above, or keep Send to all customers.
              </Alert>
            )}
            {emailSendError && (
              <Alert tone='danger' className='mt-2'>{emailSendError}</Alert>
            )}
            {emailSendResult && (
              <Alert tone='success' className='mt-2'>
                {emailSendResult.message}
              </Alert>
            )}
            <Button
              tone='primary'
              size='lg'
              block
              disabled={emailSending || !emailSubject.trim() || !emailMessage.trim() || !emailHasRecipients}
              onClick={sendEmailNewsletter}
            >
              {emailSending ? 'Sending email...' : 'Send email newsletter'}
            </Button>
          </div>
        </Panel>
      </Panel>

      {/* SMS Newsletter section */}
      <Panel className='drop-shadow-sm mt-8'>
        <PageHeader
          title='SMS'
          subtitle='Send bulk messages to customers with phone numbers'
        />
        <Panel className='mt-6 p-6'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>Message <span className='text-slate-400'>(no subject)</span></label>
              <Textarea
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                placeholder='Hello {{name}}! ...'
                rows={6}
                disabled={smsSending}
              />
            </div>
            <div className='flex items-center justify-between text-sm text-slate-500'>
              <span>{smsCharCount} characters</span>
              <span>SMS segments: {smsSegments} (160 chars each)</span>
            </div>
            <div className='flex items-center gap-3'>
              <fieldset disabled={smsSending} className='flex flex-wrap gap-4'>
                <Label className='flex items-center gap-2'>
                  <input
                    type='radio'
                    name='smsRecipientType'
                    value='all'
                    checked={smsRecipientType === 'all'}
                    onChange={(e) => setSmsRecipientType(e.target.value)}
                    className='peer cursor-pointer'
                  />
                  <span className='text-sm font-medium'>Send to all customers</span>
                </Label>
                <Label className='flex items-center gap-2'>
                  <input
                    type='radio'
                    name='smsRecipientType'
                    value='selected'
                    checked={smsRecipientType === 'selected'}
                    onChange={(e) => setSmsRecipientType(e.target.value)}
                    className='peer cursor-pointer'
                  />
                  <span className='text-sm font-medium'>Send to selected customers</span>
                  <span className='text-xs text-slate-500 ml-2'>({smsSelectedIds.size})</span>
                </Label>
              </fieldset>
            </div>
            {!smsHasRecipients && (
              <Alert tone='warning' className='mt-2'>
                No recipients selected. Please select customers from the table above, or keep Send to all customers.
              </Alert>
            )}
            {smsSendError && (
              <Alert tone='danger' className='mt-2'>{smsSendError}</Alert>
            )}
            {smsSendResult && (
              <Alert tone='success' className='mt-2'>
                {smsSendResult.message}
              </Alert>
            )}
            <Button
              tone='primary'
              size='lg'
              block
              disabled={smsSending || !smsMessage.trim() || !smsHasRecipients}
              onClick={sendSmsNewsletter}
            >
              {smsSending ? 'Sending SMS...' : 'Send bulk SMS'}
            </Button>
          </div>
        </Panel>
      </Panel>

      {/* Customer selector table */}
      <Panel className='mt-8'>
        <PageHeader title='Send to customers' subtitle='Check the boxes to select customers for a specific campaign' />
        <Panel className='mt-6 p-6'>
          {customers.error ? (
            <div className='p-5'>
              <ErrorBanner error={customers.error} onRetry={customers.reload} />
            </div>
          ) : customers.loading ? (
            <LoadingBlock label='Loading customers...' />
          ) : (
            <>
              <DataTable
                rows={customers.rows}
                columns={[
                  {
                    key: 'name',
                    label: 'Customer',
                    render: (row) => (
                      <span
                        className='flex items-center gap-2 cursor-pointer select-none'
                        onClick={() => toggleEmailSelection(row.id)}
                      >
                        <input
                          type='checkbox'
                          checked={isEmailSelected(row.id)}
                          onChange={() => toggleEmailSelection(row.id)}
                          className='cursor-pointer'
                          disabled={smsSending}
                        />
                        {row.name || 'Unnamed'}
                      </span>
                    ),
                  },
                  {
                    key: 'phone',
                    label: 'Phone',
                    render: (row) => row.phone || <span className='text-slate-400'>No phone</span>,
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    render: (row) => row.email || <span className='text-slate-400'>No email</span>,
                  },
                ]}
              />
              <div className='flex items-center justify-between px-3 py-2 border-t mt-3'>
                <span className='text-sm text-slate-600'>
                  {emailSelectedIds.size} customer{emailSelectedIds.size === 1 ? '' : 's'} selected for email
                </span>
                <span className='text-sm text-slate-600'>
                  {smsSelectedIds.size} customer{smsSelectedIds.size === 1 ? '' : 's'} selected for SMS
                </span>
              </div>
            </>
          )}
        </Panel>
      </Panel>
        </>
      ) : null}
    </>
  );
}
