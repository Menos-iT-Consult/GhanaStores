import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function usePlatformPublicSettings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await api.get('/api/platform-settings/public');
      setSettings(result.settings);
    } catch (requestError) {
      setError(requestError.message || 'Platform contact settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { settings, error, loading, reload: load };
}

export function whatsappChatUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '').replace(/^0/, '233');
  if (!digits) return '';
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}
