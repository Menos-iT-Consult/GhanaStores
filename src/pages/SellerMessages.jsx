/**
 * Seller-side contact inbox. Only ever this seller's storefront leads; the
 * scoping is enforced server-side by store_id, not by anything here.
 */
import { useCallback } from 'react';
import { api } from '../api.js';
import ContactInbox from '../components/ContactInbox.jsx';

export default function SellerMessages() {
  const fetchMessages = useCallback((qs) => api.get(`/api/contact${qs || ''}`), []);
  const updateMessage = useCallback(
    (id, status) => api.patch(`/api/contact/${id}`, { status }),
    [],
  );

  return (
    <ContactInbox
      title="Messages"
      fetchMessages={fetchMessages}
      updateMessage={updateMessage}
      emptyHint="When a customer uses the contact form on your storefront, their message appears here."
    />
  );
}