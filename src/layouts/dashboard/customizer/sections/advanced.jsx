/**
 * layouts/dashboard/customizer/sections/advanced.jsx
 * The Additional-CSS escape hatch and the reset-to-defaults action.
 */
import { Code2, RotateCcw } from 'lucide-react';
import { Accordion, TextAreaRow, Note } from '../ui.jsx';

export default function AdvancedSection({ t, str, onResetDefaults }) {
  return (
    <Accordion id="advanced" icon={Code2} title="Advanced">
      <div className="space-y-2">
        <TextAreaRow
          label="Additional CSS (scoped to the storefront preview)"
          value={t.advanced.custom_css}
          onChange={str('advanced.custom_css')}
          rows={5}
          mono
        />
        <Note>
          {'Example: .product-card { border: 2px dashed teal; } - rules are namespaced under the preview root, so the dashboard stays untouched.'}
        </Note>
        <button
          type="button"
          onClick={onResetDefaults}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset all styling to defaults
        </button>
      </div>
    </Accordion>
  );
}