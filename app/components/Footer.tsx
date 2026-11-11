import {useState, type FormEvent} from 'react';
import {NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import logoUrl from '~/assets/logo.png';
import {
  useThemeSetting,
  useThemeSettingLinks,
} from '~/weaverse/use-theme-setting';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery | null;
  publicStoreDomain: string;
}

type FooterLink = {label: string; to: string; external?: boolean};
type FooterColumn = {heading: string; links: FooterLink[]};

// Shopify-hosted customer account portal — where subscriptions are managed.
const ACCOUNT_LOGIN_URL = 'https://ykbc0p-1r.myshopify.com/account';

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Support',
    links: [
      {label: 'Contact', to: '/contact'},
      {label: 'Shipping & Returns', to: '/contact'},
      {label: 'Your Account', to: ACCOUNT_LOGIN_URL, external: true},
    ],
  },
  {
    heading: 'Connect',
    links: [
      {
        label: 'Instagram',
        to: 'https://www.instagram.com/trysleepfuel',
        external: true,
      },
      {
        label: 'TikTok',
        to: 'https://www.tiktok.com/@trysleepfuel',
        external: true,
      },
    ],
  },
];

/**
 * Legal pages, always shown in the footer's bottom bar. Kept in code rather
 * than Weaverse theme settings so they cannot be removed by accident.
 * Policy pages come from Shopify (Settings > Policies); the legal notice is a
 * Shopify page with the handle `legal-notice`.
 */
const LEGAL_LINKS: FooterLink[] = [
  {label: 'Privacy Policy', to: '/privacy-policy'},
  {label: 'Terms of Service', to: '/policies/terms-of-service'},
  {label: 'Refund Policy', to: '/policies/refund-policy'},
  {label: 'Shipping Policy', to: '/policies/shipping-policy'},
  {label: 'Subscription Policy', to: '/policies/subscription-policy'},
  {label: 'Legal Notice', to: '/pages/legal-notice'},
];

const FDA_DISCLAIMER = `* These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure or prevent any disease.
Information on this site is provided for informational purposes only. It is not meant to substitute for medical advice from your physician or other medical professional. You should not use the information contained herein for diagnosing or treating a health problem or disease, or prescribing any medication. Carefully read all product documentation. If you have or suspect that you have a medical problem, promptly contact your regular health care provider.`;

export function Footer(_props: FooterProps) {
  // Editable in Weaverse Studio under Theme > Customize > Footer. The
  // constants above remain the shipped defaults until a merchant saves.
  const newsletterHeading = useThemeSetting(
    'footerNewsletterHeading',
    'Get sleep tips, science, offers, and 10% off your first order.',
  );
  const disclaimer = useThemeSetting('footerDisclaimer', FDA_DISCLAIMER);
  const supportHeading = useThemeSetting('footerSupportHeading', 'Support');
  const connectHeading = useThemeSetting('footerConnectHeading', 'Connect');
  const supportLinks = useThemeSettingLinks(
    'footerSupportLinks',
    FOOTER_COLUMNS[0].links,
  );
  const connectLinks = useThemeSettingLinks(
    'footerConnectLinks',
    FOOTER_COLUMNS[1].links,
  );
  const columns: FooterColumn[] = [
    {heading: supportHeading, links: supportLinks},
    {heading: connectHeading, links: connectLinks},
  ];

  return (
    <footer
      className="relative mt-auto"
      style={{background: 'var(--color-footer)', color: '#fff'}}
    >
      {/* Cream rounded lip falling over the dark footer */}
      <div
        className="h-10 rounded-b-[2rem] sm:h-14 sm:rounded-b-[2.75rem]"
        style={{background: 'var(--color-cream)'}}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        {/* Top row: wordmark + payment chips */}
        <div className="flex flex-col gap-8 border-b border-white/10 pb-12 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <img
              src={logoUrl}
              alt="SleepFuel"
              className="h-8 w-auto"
              width={1076}
              height={223}
              style={{filter: 'brightness(0) invert(1)'}}
            />
            <h2 className="mt-6 text-2xl leading-snug text-white/90">
              {newsletterHeading}
            </h2>
            <NewsletterForm />
            <p className="mt-4 text-xs text-white/45">
              We care about protecting your data. Read more in our{' '}
              <NavLink
                to="/privacy-policy"
                className="underline hover:text-white/80"
              >
                Privacy Policy
              </NavLink>
              .
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 lg:gap-x-14">
            {columns.map((col) => (
              <div key={col.heading}>
                <h3 className="text-sm font-semibold text-white/55">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link, i) => (
                    <li key={`${link.label}-${i}`}>
                      {link.external ? (
                        <a
                          href={link.to}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-white/85 hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <NavLink
                          to={link.to}
                          prefetch="intent"
                          className="text-sm text-white/85 hover:text-white"
                        >
                          {link.label}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-8 text-xs leading-relaxed text-white/45">
          <p className="whitespace-pre-line">{disclaimer}</p>
          <nav aria-label="Legal" className="mt-6">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    prefetch="intent"
                    className="underline-offset-2 hover:text-white/80 hover:underline"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-4">
            © {new Date().getFullYear()} SleepFuel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Footer newsletter capture. Posts to the same `/api/klaviyo-subscribe`
 * endpoint the popup uses, tagged with its own `source` so Klaviyo can tell
 * footer signups from popup signups.
 */
function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    const body = new FormData();
    body.set('step', 'email');
    body.set('email', email);
    body.set('source', 'SleepFuel storefront footer');

    try {
      const res = await fetch('/api/klaviyo-subscribe', {method: 'POST', body});
      const data = (await res.json()) as {error?: string};
      if (data.error) {
        setError(data.error);
        setStatus('idle');
        return;
      }
      setStatus('done');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return (
      <p className="mt-5 max-w-sm text-sm text-white/85" role="status">
        Thanks — check your inbox for your code.
      </p>
    );
  }

  return (
    <>
      <form
        className="mt-5 flex max-w-sm items-center gap-2 rounded-full border border-white/20 bg-white/5 px-2 py-1.5"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          className="m-0 min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Subscribe"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M3 8h9M8 4l4 4-4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
      {error && (
        <p className="mt-2 max-w-sm text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
