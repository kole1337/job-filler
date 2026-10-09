// Runs on the local portal so its "Install extension" page can tell whether the
// extension is installed. Ports aren't part of match patterns, so this covers
// the portal on any localhost port. It only announces itself — no profile data.
export default defineContentScript({
  matches: ['http://localhost/*', 'http://127.0.0.1/*'],
  runAt: 'document_idle',

  main() {
    const hello = () =>
      window.postMessage(
        { source: 'job-filler-extension', type: 'HELLO', version: browser.runtime.getManifest().version },
        window.location.origin,
      );

    // The page may have pinged before this script loaded, so announce once now
    // and answer any later pings.
    window.addEventListener('message', (e) => {
      if (e.source === window && e.data?.source === 'job-filler-portal' && e.data.type === 'PING') hello();
    });
    hello();
  },
});
