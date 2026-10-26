// AffiliateLinkCard.jsx
// DiDwa - Affiliate Link Card Component
import { useState } from 'react';
// Import formatGHS from the lib/affiliate service (project-wide utilities)
import { formatGHS } from '../../lib/affiliate';

export function AffiliateLinkCard({ referralCode, onCopy }) {
  const [isCopied, setIsCopied] = useState(false);
  const link = `${window.location.origin}/affiliate/signup?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (onCopy) onCopy();
    } catch (err) {
      // Fallback: manual selection
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (onCopy) onCopy();
    }
  };

  return (
    <div className="affiliate-link-card bg-card p-5 rounded-xl shadow-sm">
      <h4 className="font-semibold mb-3">Share Your Referral</h4>
      <p className="text-sm text-muted mb-4">
        Earn 10% recurring commission on every plan upgrade
      </p>

      <div className="bg-white rounded p-3 mb-4">
        <input
          type="text"
          value={link}
          readOnly
          onClick={(e) => e.target.select()}
          className="w-full p-2 border rounded focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          disabled={isCopied}
          className={`btn ${isCopied ? 'btn-secondary' : 'btn-primary'}`}
        >
          {isCopied ? 'Copied!' : 'Copy Link'}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          Open Portal
        </a>
      </div>

      {isCopied && (
        <p className="text-xs text-success mt-2">
          Link copied to clipboard!
        </p>
      )}
    </div>
  );
}