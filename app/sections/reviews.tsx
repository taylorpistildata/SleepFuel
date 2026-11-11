import {forwardRef, useState} from 'react';
import {createSchema, type HydrogenComponentProps} from '@weaverse/hydrogen';
import {Stars, formatCount} from '~/components/Stars';
import reviewsData from '~/data/reviews.json';

type Review = {
  id: string;
  title: string;
  body: string;
  rating: number;
  name: string;
  date: string;
  verified: boolean;
  incentivized: boolean;
};

const REVIEWS = reviewsData.reviews as Review[];
const TOTAL = reviewsData.total;
const AVERAGE = reviewsData.average;
const DISTRIBUTION = reviewsData.distribution as Record<string, number>;

const INITIAL_SHOWN = 6;

type ReviewsSectionProps = Partial<HydrogenComponentProps> & {
  heading?: string;
};

/**
 * Customer reviews, rendered from `app/data/reviews.json`.
 *
 * The headline average, count and distribution are computed from exactly the
 * reviews in that file, so the summary always matches the cards shown.
 */
const ReviewsSection = forwardRef<HTMLElement, ReviewsSectionProps>(
  function ReviewsSection({heading, children, ...rest}, ref) {
    const [shown, setShown] = useState(INITIAL_SHOWN);
    const visible = REVIEWS.slice(0, shown);

    return (
      <section
        ref={ref}
        {...rest}
        id="reviews"
        className="mx-auto w-full max-w-5xl px-5 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20"
      >
        <h2 className="text-3xl tracking-tight sm:text-4xl">{heading}</h2>

        {/* Summary: average, stars, count, and the full distribution */}
        <div className="mt-8 grid gap-8 rounded-3xl border border-[color:var(--color-border)] p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="text-center sm:text-left">
            <div className="text-5xl font-normal leading-none tracking-tight">
              {AVERAGE.toFixed(2)}
            </div>
            <Stars rating={AVERAGE} size={18} className="mt-3" />
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">
              {formatCount(TOTAL)} reviews
            </p>
          </div>

          <dl className="flex flex-col justify-center gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = DISTRIBUTION[String(star)] ?? 0;
              const pct = TOTAL ? (count / TOTAL) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <dt className="w-10 shrink-0 text-[color:var(--color-muted)]">
                    {star} star
                  </dt>
                  <dd className="flex flex-1 items-center gap-3">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--color-border)]">
                      <span
                        className="block h-full rounded-full bg-[#f5a623]"
                        style={{width: `${pct}%`}}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right tabular-nums text-[color:var(--color-muted)]">
                      {formatCount(count)}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {visible.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {shown < REVIEWS.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + INITIAL_SHOWN)}
              className="btn-outline px-6 text-sm"
            >
              Show more reviews
            </button>
          </div>
        )}

        {children}
      </section>
    );
  },
);

export default ReviewsSection;

function ReviewCard({review}: {review: Review}) {
  return (
    <article className="flex flex-col rounded-3xl border border-[color:var(--color-border)] p-5">
      <Stars rating={review.rating} size={14} />
      <h3 className="mt-3 font-medium leading-snug">{review.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--color-muted)]">
        {review.body}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--color-muted)]">
        <span className="font-medium text-[color:var(--color-ink)]">
          {review.name}
        </span>
        {review.verified && (
          <span className="rounded-full bg-[color:var(--color-sand)] px-2 py-0.5 font-medium text-[color:var(--color-ink)]">
            Verified buyer
          </span>
        )}
        <span className="ml-auto tabular-nums">{review.date}</span>
      </div>
    </article>
  );
}

export const schema = createSchema({
  type: 'reviews',
  title: 'Customer reviews',
  settings: [
    {
      group: 'Content',
      inputs: [
        {
          type: 'text',
          name: 'heading',
          label: 'Heading',
          defaultValue: 'What people are saying',
        },
      ],
    },
  ],
  presets: {heading: 'What people are saying'},
});
