<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Affiliate Program - DiDwa Ghana</title>
  <link rel="stylesheet" href="/css/app.css" />
</head>
<body className="min-h-screen bg-slate-50">
  <PublicShell>
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Earn by Referring Merchants
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Join the DiDwa affiliate program and earn commissions on every merchant
          you refer who upgrades to a paid plan.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">How It Works</h2>
            <ol className="list-decimal list-inside space-y-3 text-slate-600">
              <li>
                Sign up for the affiliate program using the form below
              </li>
              <li>
                Share your unique referral link with merchants
              </li>
              <li>
                Earn 10% commission when referred merchants upgrade to a paid plan
              </li>
              <li>
                Receive payouts via Mobile Money once you reach 50 GHS minimum
              </li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Earnings</h2>
            <dl className="grid grid-cols-2 gap-2 text-slate-600">
              <dt className="font-medium">Commission Rate</dt>
              <dd className="text-emerald-600">10%</dd>
              <dt className="font-medium">Minimum Payout</dt>
              <dd className="text-emerald-600">50 GHS</dd>
              <dt className="font-medium">Payment Method</dt>
              <dd>Mobile Money (MTN/MoMo)</dd>
            </dl>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Join the Program</h2>

          {affiliate ? (
            <>
              <p className="text-slate-500 mb-4">
                Welcome, {affiliate.fullName || affiliate.email}! You're already
                registered as an affiliate. Start sharing your referral link below.
              </p>
              <a
                href="/affiliate/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Open your dashboard <ArrowRight size={16} aria-hidden="true" />
              </a>
            </>
          ) : (
            <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  await fetch('/api/affiliate/me', {
                    method: 'GET',
                    headers: { Authorization: form.dataset.token || '' },
                  });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Smartphone size={16} aria-hidden="true" />
                  Sign Up Free
                </button>
              </form>

              <p className="mt-3 text-sm text-slate-500">
                No account yet? <a href="/affiliate/signup" className="text-emerald-600 hover underline">
                  Create an account
                </a> to start earning.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  </PublicShell>
</body>
</html>