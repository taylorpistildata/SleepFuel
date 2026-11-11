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
