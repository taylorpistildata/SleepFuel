import {useEffect, useState, type FormEvent} from 'react';
import {useThemeSetting} from '~/weaverse/use-theme-setting';
import popupImage from '~/assets/feature-counter.jpg';

const COOKIE_NAME = 'sf_popup_seen';
/** Set once the visitor has unlocked a code; hides the side tab. */
const SIGNED_UP_COOKIE = 'sf_popup_signed_up';
const SIGNED_UP_DAYS = 365;
const COOKIE_DAYS = 30;
const DELAY_MS = 4000;

function hasCookie(name: string) {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith(`${name}=`));
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

type Step = 'email' | 'phone' | 'confirm' | 'reveal';
type Status = 'idle' | 'submitting' | 'error';

type SubscribeResponse =
  | {success: true; discountCode: string}
  | {error: string};

export function EmailCapturePopup() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revealCode, setRevealCode] = useState('WELCOME10');
  /** Null until read on the client, so the tab never flashes in SSR. */
  const [signedUp, setSignedUp] = useState<boolean | null>(null);

  // Headline copy is editable in Studio (Theme > Customize > Email popup).
  // The Klaviyo flow, list ids, and discount codes stay in code on purpose.
  const emailTitle = useThemeSetting('popupEmailTitle', 'Claim Your 10% Off');
  const emailSubtitle = useThemeSetting(
    'popupEmailSubtitle',
    'Sign up to unlock your code, valid for any SleepFuel order.',
  );
  const smsTitle = useThemeSetting('popupSmsTitle', 'Get 15% Off Now');
  const smsSubtitle = useThemeSetting(
    'popupSmsSubtitle',
    'Even more savings when you subscribe to SMS for exclusive offers and sleep science.',
  );

  useEffect(() => {
    setSignedUp(hasCookie(SIGNED_UP_COOKIE));
  }, []);

  useEffect(() => {
    if (hasCookie(COOKIE_NAME) || hasCookie(SIGNED_UP_COOKIE)) return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  function markSignedUp() {
    setCookie(SIGNED_UP_COOKIE, '1', SIGNED_UP_DAYS);
  }

  /** "Save 10%" side tab: reopens the popup at the start. */
  function openFromTab() {
    setStep('email');
    setStatus('idle');
    setErrorMsg(null);
    setOpen(true);
  }

  function dismiss() {
    if (hasCookie(SIGNED_UP_COOKIE)) setSignedUp(true);
    setOpen(false);
    setCookie(COOKIE_NAME, '1', COOKIE_DAYS);
  }

  async function subscribe(payloadStep: 'email' | 'sms') {
    const fd = new FormData();
    fd.set('step', payloadStep);
    fd.set('email', email);
    if (payloadStep === 'sms') fd.set('phone', phone);
    const res = await fetch('/api/klaviyo-subscribe', {method: 'POST', body: fd});
    const data = (await res.json()) as SubscribeResponse;
    if ('error' in data) throw new Error(data.error);
    return data.discountCode;
  }

  async function handleEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg(null);
    try {
      await subscribe('email'); // → Newsletter list (WELCOME10)
      markSignedUp();
      setRevealCode('WELCOME10');
      setStatus('idle');
      setStep('phone');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function handlePhone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg(null);
    try {
      await subscribe('sms'); // → SMS Subscriber list (WELCOME15)
      setRevealCode('WELCOME15');
      setStatus('idle');
      setStep('confirm');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function declineSms() {
    // They already unlocked 10% by giving their email in step 1.
    setRevealCode('WELCOME10');
    setStep('reveal');
  }

  if (!open) {
    if (signedUp !== false) return null;
    return (
      <button
        type="button"
        onClick={openFromTab}
        aria-haspopup="dialog"
        className="fixed right-0 top-1/2 z-40 rounded-r-xl px-2 py-4 text-xs font-semibold uppercase tracking-wider shadow-lg transition-[padding] hover:pl-3 sm:px-2.5 sm:py-5 sm:text-sm"
        style={{
          background: 'var(--color-awaking)',
          color: 'var(--color-midnight)',
          fontFamily: 'var(--font-body)',
          writingMode: 'vertical-rl',
          transform: 'translateY(-50%) rotate(180deg)',
        }}
      >
        Save 10%
      </button>
    );
  }

  const badge =
    step === 'phone' || step === 'confirm' || revealCode === 'WELCOME15'
      ? '15% OFF'
      : '10% OFF';
  const submitting = status === 'submitting';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sf-popup-title"
      style={{fontFamily: 'var(--font-body)'}}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close popup"
      />

      <div className="relative grid w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:grid-cols-2">
        {/* Image pane (desktop only) */}
        <div className="relative hidden sm:block">
          <img
            src={popupImage}
            alt="SleepFuel mixed berry drink mix sticks"
            className="h-full w-full object-cover"
          />
          <span
            className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{
              background: 'var(--color-awaking)',
              color: 'var(--color-midnight)',
            }}
          >
            {badge}
          </span>
        </div>

        {/* Content pane */}
        <div className="relative max-h-[88vh] overflow-y-auto p-8 sm:p-9">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-recovery)] hover:bg-[color:var(--color-neutral)]"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
            </svg>
          </button>

          {step === 'email' && (
            <Pane
              title={emailTitle}
              subtitle={emailSubtitle}
            >
              <form onSubmit={handleEmail} className="mt-6 space-y-3">
                <label className="block">
                  <span className="sr-only">Email address</span>
                  <input
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-[color:var(--color-jet)] bg-[color:var(--color-neutral)] px-5 py-3.5 text-base outline-none focus:border-[color:var(--color-midnight)]"
                  />
                </label>
                <ErrorText message={errorMsg} />
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Working…' : 'Reveal Code'}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="block w-full text-center text-xs text-[color:var(--color-recovery)] hover:underline"
                >
                  No thanks, I&rsquo;ll pay full price
                </button>
              </form>
              <Fineprint>
                By submitting your email, you agree to receive marketing emails
                from SleepFuel. Unsubscribe anytime.
              </Fineprint>
            </Pane>
          )}

          {step === 'phone' && (
            <Pane
              title={smsTitle}
              subtitle={smsSubtitle}
            >
              <form onSubmit={handlePhone} className="mt-6 space-y-3">
                <div className="flex items-center rounded-2xl border border-[color:var(--color-jet)] bg-[color:var(--color-neutral)] px-4 focus-within:border-[color:var(--color-midnight)]">
                  <span className="shrink-0 pr-3 text-base text-[color:var(--color-recovery)]">
                    +1
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number"
                    autoComplete="tel-national"
                    className="w-full bg-transparent py-3.5 text-base outline-none"
                  />
                </div>
                <ErrorText message={errorMsg} />
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Working…' : 'Sign up'}
                </button>
                <button
                  type="button"
                  onClick={declineSms}
                  className="block w-full text-center text-sm font-semibold text-[color:var(--color-midnight)] underline hover:opacity-80"
                >
                  No thanks, I&rsquo;ll take 10% off
                </button>
              </form>
              <Fineprint>
                By signing up via text, you agree to receive recurring automated
                marketing messages from SleepFuel at the number provided. Consent
                is not a condition of purchase. Reply STOP to cancel, HELP for
                help. Msg &amp; data rates may apply.
              </Fineprint>
            </Pane>
          )}

          {step === 'confirm' && (
            <Pane
              title={
                <>
                  Thanks!
                  <br />
                  One Last Step…
                </>
              }
              subtitle="Please check your phone and reply Y. Your 15% code will arrive shortly."
            >
              <button
                type="button"
                onClick={() => setStep('reveal')}
                className="btn-primary mt-6 w-full"
              >
                Continue
              </button>
              <Fineprint>
                Offer valid for new subscribers only. Cannot be combined with any
                other discounts or promotions.
              </Fineprint>
            </Pane>
          )}

          {step === 'reveal' && (
            <Pane
              title="You’re in."
              subtitle={`Use this code at checkout for ${
                revealCode === 'WELCOME15' ? '15%' : '10%'
              } off your first order:`}
            >
              <div
                className="mt-5 select-all rounded-2xl px-4 py-4 text-center text-xl font-semibold tracking-widest"
                style={{
                  background: 'var(--color-neutral)',
                  color: 'var(--color-midnight)',
                }}
              >
                {revealCode}
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="btn-primary mt-5 w-full"
              >
                Start shopping
              </button>
            </Pane>
          )}
        </div>
      </div>
    </div>
  );
}

function Pane({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="pt-2">
      <h2
        id="sf-popup-title"
        className="text-3xl font-semibold leading-tight sm:text-4xl"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-midnight)',
        }}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-recovery)]">
        {subtitle}
      </p>
      {children}
    </div>
  );
}

function ErrorText({message}: {message: string | null}) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

function Fineprint({children}: {children: React.ReactNode}) {
  return (
    <p className="mt-4 text-[10px] leading-snug text-[color:var(--color-recovery)]">
      {children}
    </p>
  );
}
