export const PARTNER_OUTREACH_TEMPLATES = {
  campus: {
    subject: 'Invitation to become a DiDwa Campus Ambassador',
    body: `Hello {{name}},

DiDwa is inviting a small group of campus leaders to help student entrepreneurs build and grow their businesses online. As a DiDwa Campus Ambassador, your campus network can introduce merchants to the platform and recruit local affiliates.

The strategic partner program includes a partner dashboard, tracked merchant and affiliate referrals, and custom-approved override rates. Participation and rates are confirmed by the DiDwa team after an application review.

Would you be open to a short conversation about bringing the program to {{institution}}?

Regards,
{{sender_name}}
DiDwa`,
  },
  trade_association: {
    subject: 'Partnership opportunity for {{organization}} and its SME members',
    body: `Hello {{name}},

DiDwa would like to explore a strategic partnership with {{organization}} to help member businesses manage products, orders, payments, and online selling.

Approved partners can onboard merchants directly, recruit affiliates into a tracked network, and review their network performance through a dedicated portal. Partner terms, including commission overrides, are agreed individually and managed through DiDwa Central Admin.

Could we arrange a conversation with your team to discuss a pilot for your members?

Regards,
{{sender_name}}
DiDwa`,
  },
  tech_hub: {
    subject: 'Explore a DiDwa ecosystem partnership with {{organization}}',
    body: `Hello {{name}},

We are reaching out to explore a partnership between DiDwa and {{organization}}. The program is designed for ecosystem builders who can support merchants and recruit community affiliates.

Partners receive tracked onboarding and recruitment links, network reporting, and individually approved commission terms. The DiDwa team handles partner approvals and payout reviews centrally.

Would you be available to discuss a possible community pilot?

Regards,
{{sender_name}}
DiDwa`,
  },
  influencer: {
    subject: 'Invitation to join the DiDwa Strategic Partner Program',
    body: `Hello {{name}},

We would like to invite you to explore the DiDwa Strategic Partner Program. It is built for trusted voices who can help merchants discover practical tools for managing and growing their businesses.

Your partner network can include both merchants and recruited affiliates. Referrals are tracked through dedicated links, while application approvals, individual override rates, and payout decisions are managed by DiDwa.

If this sounds relevant to your audience, we would be glad to share more and discuss a suitable partnership.

Regards,
{{sender_name}}
DiDwa`,
  },
};

export const PARTNER_SYSTEM_PROMPT = `You are DiDwa's strategic partner outreach assistant. Write concise, respectful, locally relevant invitations for campus leaders, tech hub directors, SME associations, and trusted influencers. Explain that approved partners can recruit both merchants and affiliates, that commission override rates are individually approved by DiDwa, and that payouts are reviewed centrally. Never promise a specific rate, guaranteed earnings, exclusivity, or approval. Keep the requested template audience and supplied facts; do not invent program terms.`;
