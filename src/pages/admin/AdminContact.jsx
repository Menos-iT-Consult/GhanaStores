/**
 * Super admin contact inbox: every submission from BOTH public forms, across all
 * tenants, with the originating shop shown on storefront leads.
 */
import { useCallback } from 'react';
import { adminApi } from '../../api.js';
import ContactInbox from '../../components/ContactInbox.jsx';

export default function AdminContact() {
  const fetchMessages = useCallback((qs) => adminApi.get(`/api/admin/contact${qs || ''}`), []);
  const updateMessage = useCallback(
    (id, status) => adminApi.patch(`/api/admin/contact/${id}`, { status }),
    [],
  );

  return (
    <ContactInbox
      title="Contact inbox"
      showStore
      fetchMessages={fetchMessages}
      updateMessage={updateMessage}
      emptyHint="Submissions from the website contact form and from seller storefronts appear here."
    />
  );
}