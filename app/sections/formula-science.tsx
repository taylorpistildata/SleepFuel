import {forwardRef} from 'react';
import {createSchema, type HydrogenComponentProps} from '@weaverse/hydrogen';
import formulaImage from '~/assets/formula-glass.jpg';
import ingredientsVideo from '~/assets/ingredients-video.mp4';
import {autoplayVideo} from '~/lib/autoplayVideo';
import {imageUrl, type WeaverseImage} from './shared';

type FormulaScienceProps = Partial<HydrogenComponentProps> & {
  heading?: string;
  headingAccent?: string;
  video?: WeaverseImage;
  poster?: WeaverseImage;
  videoLabel?: string;
};

/** "Synergistic Ingredients" — looping video beside the ingredient grid. */
const FormulaScience = forwardRef<HTMLElement, FormulaScienceProps>(
  function FormulaScience(
    {heading, headingAccent, video, poster, videoLabel, children, ...rest},
    ref,
  ) {
    return (
      <section ref={ref} {...rest} className="bg-[color:var(--color-cream)]">
        <div className="mx-auto max-w-7xl px-5 pt-10 pb-10 sm:px-6 sm:pb-20 lg:px-8 lg:pt-14 lg:pb-28">
          <h2 className="max-w-4xl text-[36px] font-normal leading-[1.05] tracking-tight sm:text-[45px] lg:text-[54px]">
            {heading}{' '}
            <span className="text-[color:var(--color-muted)]">
              {headingAccent}
            </span>
          </h2>

          <div className="mt-12 grid items-start gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-3xl">
              <video
                ref={autoplayVideo}
                src={imageUrl(video ?? null, ingredientsVideo as unknown as string)}
                poster={imageUrl(poster ?? null, formulaImage as unknown as string)}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={videoLabel}
                className="aspect-square w-full object-cover"
              />
            </div>

            <div>
              <dl className="grid gap-x-8 gap-y-9 sm:grid-cols-2">{children}</dl>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

export default FormulaScience;

export const schema = createSchema({
  type: 'formula-science',
  title: 'Synergistic ingredients',
  childTypes: ['ingredient-item'],
  settings: [
    {
      group: 'Content',
      inputs: [
        {
          type: 'text',
          name: 'heading',
          label: 'Heading',
          defaultValue: 'Synergistic Ingredients.',
        },
        {
          type: 'text',
          name: 'headingAccent',
          label: 'Heading (muted second half)',
          defaultValue: 'Better Sleep.',
        },
        {type: 'video', name: 'video', label: 'Looping video'},
        {type: 'image', name: 'poster', label: 'Video poster'},
        {
          type: 'text',
          name: 'videoLabel',
          label: 'Video aria-label',
          defaultValue: 'Mixing SleepFuel into a glass',
        },
      ],
    },
  ],
  presets: {
    heading: 'Synergistic Ingredients.',
    headingAccent: 'Better Sleep.',
    videoLabel: 'Mixing SleepFuel into a glass',
    children: [{type: 'ingredient-item'}],
  },
});
