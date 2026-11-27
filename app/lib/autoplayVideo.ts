/**
 * Ref callback for the storefront's background videos.
 *
 * React does not write `muted` into server-rendered HTML, so some mobile
 * browsers (iOS Safari in particular) see an un-muted video on first paint,
 * refuse to autoplay it, and leave the poster or an empty box. Setting the
 * property and calling play() once the element mounts fixes that. A refusal
 * (Low Power Mode, data saver) is ignored: the poster or backing colour stays.
 */
export function autoplayVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  if (video.paused) {
    video.play()?.catch(() => {
      // Autoplay blocked; nothing to do.
    });
  }
}

/**
 * Ref callback for videos below the fold: nothing downloads until the video
 * is within ~400px of the viewport. Render the video with `data-src` and
 * `preload="none"` (no `src`); this sets `src` when it comes near and then
 * starts it like `autoplayVideo`.
 */
export function lazyAutoplayVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  const load = () => {
    const src = video.dataset.src;
    if (src && video.getAttribute('src') !== src) {
      video.src = src;
      video.preload = 'auto';
    }
    autoplayVideo(video);
  };
  if (typeof IntersectionObserver === 'undefined') {
    load();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    },
    {rootMargin: '400px 0px'},
  );
  observer.observe(video);
}
