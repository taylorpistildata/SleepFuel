import {forwardRef} from 'react';
import {createSchema, type HydrogenComponentProps} from '@weaverse/hydrogen';

type CompetitorRowProps = Partial<HydrogenComponentProps> & {
  label?: string;
  shortLabel?: string;
  sleepfuel?: string;
  others?: string;
};

/** One comparison row inside `competitor`. */
const CompetitorRow = forwardRef<HTMLTableRowElement, CompetitorRowProps>(
  function CompetitorRow({label, shortLabel, sleepfuel, others, ...rest}, ref) {
    return (
      <tr ref={ref} {...rest}>
        <th
          scope="row"
          className="border-t border-[color:var(--color-border)] px-2 py-3 text-left font-medium text-[color:var(--color-ink)] sm:px-3 sm:py-4"
        >
          {label}
        </th>
        <td className="border-t border-white/15 px-2 py-3 text-center font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] sm:px-3 sm:py-4">
          {sleepfuel}
        </td>
        <td className="border-t border-[color:var(--color-border)] px-2 py-3 text-center text-[color:var(--color-muted)] sm:px-3 sm:py-4">
          {others}
        </td>
      </tr>
    );
  },
);

export default CompetitorRow;

export const schema = createSchema({
  type: 'competitor-row',
  title: 'Comparison row',
  settings: [
    {
      group: 'Content',
      inputs: [
        {type: 'text', name: 'label', label: 'Row label'},
        {
          type: 'text',
          name: 'shortLabel',
          label: 'Short label (narrow screens, optional)',
        },
        {type: 'text', name: 'sleepfuel', label: 'SleepFuel value'},
        {type: 'text', name: 'others', label: 'Others value'},
      ],
    },
  ],
});
