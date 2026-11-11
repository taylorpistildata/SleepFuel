import type {IngredientIconKey} from '~/sections/ingredient-icons';

/**
 * SleepFuel's actives and doses, as printed on the label. Shared by the
 * product page and the /gummies landing page so the two never disagree.
 */
export const INGREDIENTS: Array<{
  name: string;
  dose: string;
  benefit: string;
  icon: IngredientIconKey;
}> = [
  {
    name: 'Magnesium Glycinate',
    dose: '200 mg · 48% DV',
    benefit:
      'Relaxes tight muscles and settles the nervous system as you wind down.',
    icon: 'crystal',
  },
  {
    name: 'L-Theanine',
    dose: '200 mg',
    benefit:
      'A calming amino acid from tea that quiets a racing mind without sedation.',
    icon: 'teacup',
  },
  {
    name: 'GABA',
    dose: '200 mg',
    benefit:
      'The brain’s primary calming neurotransmitter — dials down mental chatter.',
    icon: 'mind',
  },
  {
    name: 'Inositol',
    dose: '200 mg',
    benefit:
      'Supports a balanced mood so the mind can let go and ease toward rest.',
    icon: 'molecule',
  },
  {
    name: 'Lemon Balm Extract',
    dose: '100 mg · leaf',
    benefit:
      'A time-honored calming herb that softens tension and restlessness.',
    icon: 'leaf',
  },
  {
    name: 'Melatonin',
    dose: '2 mg · micro-dose',
    benefit:
      'A micro-dose that gently cues your body clock for sleep — no morning grogginess.',
    icon: 'moon',
  },
];
