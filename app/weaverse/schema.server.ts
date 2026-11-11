import type {HydrogenThemeSchema} from '@weaverse/hydrogen';
import {version} from '../../package.json';

/**
 * Theme-level settings surfaced in Weaverse Studio > Theme > Customize.
 *
 * Defaults mirror the tokens declared in `app/styles/app.css` so the Studio
 * opens matching the live storefront. Changing a value here only changes the
 * default for a *new* project — once a merchant saves in Studio, their value
 * wins.
 */
export const themeSchema: HydrogenThemeSchema = {
  info: {
    version,
    author: 'SleepFuel',
    name: 'SleepFuel Storefront',
    authorProfilePhoto: '',
    documentationUrl: 'https://docs.weaverse.io',
    supportUrl: 'https://help.weaverse.io/',
  },
  settings: [
    {
      group: 'Colors',
      inputs: [
        {
          type: 'color',
          name: 'colorCream',
          label: 'Page background',
          defaultValue: '#f6f3ef',
        },
        {
          type: 'color',
          name: 'colorInk',
          label: 'Headings & primary text',
          defaultValue: '#1c1b1a',
        },
        {
          type: 'color',
          name: 'colorMuted',
          label: 'Secondary text',
          defaultValue: '#5f6368',
        },
        {
          type: 'color',
          name: 'colorBorder',
          label: 'Hairline borders',
          defaultValue: '#e2dbd3',
        },
        {
          type: 'color',
          name: 'colorBlue',
          label: 'Primary CTA',
          defaultValue: '#1b4de0',
        },
        {
          type: 'color',
          name: 'colorFooter',
          label: 'Footer background',
          defaultValue: '#262220',
        },
      ],
    },
    {
      group: 'Layout',
      inputs: [
        {
          type: 'range',
          name: 'pageWidth',
          label: 'Max page width',
          configs: {min: 1100, max: 1600, step: 20, unit: 'px'},
          defaultValue: 1280,
        },
      ],
    },
    {
      group: 'Promo ticker',
      inputs: [
        {
          type: 'textarea',
          name: 'tickerMessages',
          label: 'Messages (one per line)',
          defaultValue: [
            'Free US shipping on orders $50+',
            'Subscribe & Save 15% — cancel anytime',
            '6 evidence-backed ingredients',
            'Fall asleep faster. Wake up clear.',
            'Powered by Magnesium, L-Theanine + micro-dose Melatonin',
          ].join('\n'),
        },
      ],
    },
    {
      group: 'Header',
      inputs: [
        {
          type: 'textarea',
          name: 'headerNavLinks',
          label: 'Nav links (one "Label | /path" per line)',
          defaultValue: 'Shop | /products/sleepfuel-drink-mix',
        },
      ],
    },
    {
      group: 'Footer',
      inputs: [
        {
          type: 'text',
          name: 'footerNewsletterHeading',
          label: 'Newsletter heading',
          defaultValue:
            'Get sleep tips, science, offers, and 10% off your first order.',
        },
        {
          type: 'text',
          name: 'footerSupportHeading',
          label: 'Column 1 heading',
          defaultValue: 'Support',
        },
        {
          type: 'textarea',
          name: 'footerSupportLinks',
          label: 'Column 1 links (one "Label | /path" per line)',
        },
        {
          type: 'text',
          name: 'footerConnectHeading',
          label: 'Column 2 heading',
          defaultValue: 'Connect',
        },
        {
          type: 'textarea',
          name: 'footerConnectLinks',
          label: 'Column 2 links (one "Label | /path" per line)',
        },
        {
          type: 'textarea',
          name: 'footerDisclaimer',
          label: 'FDA disclaimer',
        },
      ],
    },
    {
      group: 'Email popup',
      inputs: [
        {
          type: 'text',
          name: 'popupEmailTitle',
          label: 'Step 1 title',
          defaultValue: 'Claim Your 10% Off',
        },
        {
          type: 'textarea',
          name: 'popupEmailSubtitle',
          label: 'Step 1 subtitle',
          defaultValue:
            'Sign up to unlock your code, valid for any SleepFuel order.',
        },
        {
          type: 'text',
          name: 'popupSmsTitle',
          label: 'Step 2 title',
          defaultValue: 'Get 15% Off Now',
        },
        {
          type: 'textarea',
          name: 'popupSmsSubtitle',
          label: 'Step 2 subtitle',
          defaultValue:
            'Even more savings when you subscribe to SMS for exclusive offers and sleep science.',
        },
      ],
    },
  ],
};
