/**
 * Drink mix vs gummies comparison, shared by /gummies and /blackfriday26.
 * Claims about gummies stay general or are sourced in FOOTNOTES.
 */

export const COMPARISON_ROWS: Array<{
  label: string;
  sleepfuel: string;
  others: string;
}> = [
  {label: 'Melatonin per serving', sleepfuel: '2 mg', others: 'Often 3 to 10 mg'},
  {
    label: 'Dose you actually get',
    sleepfuel: 'Every dose listed on the label',
    others: '74% to 347% of the label in lab tests¹',
  },
  {label: 'Magnesium glycinate', sleepfuel: '200 mg', others: 'Rarely included'},
  {
    label: 'L-theanine, GABA, lemon balm',
    sleepfuel: 'All three',
    others: 'Usually melatonin alone',
  },
  {label: 'Sugar', sleepfuel: '0 g', others: 'Usually added sugar'},
  {label: 'Calories', sleepfuel: '0', others: 'Usually some'},
  {label: 'Looks like candy to kids', sleepfuel: 'No', others: 'Yes²'},
  {label: 'Form', sleepfuel: 'Stick mixed into a drink', others: 'Chewed like candy'},
];

export const FOOTNOTES = [
  {
    text: 'In a lab analysis of 25 melatonin gummy products sold in the US, measured melatonin ranged from 74% to 347% of the labeled amount, and one product contained none.',
    source: 'Cohen et al., JAMA, 2023',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10130950/',
  },
  {
    text: 'Pediatric melatonin ingestions reported to US poison centers rose 530% from 2012 to 2021.',
    source: 'CDC MMWR, 2022',
    href: 'https://www.cdc.gov/mmwr/volumes/71/wr/mm7122a1.htm',
  },
];
