export function createThankYouAudioPlayer(audio, onStatus) {
  let status = 'idle';
  let disposed = false;
  let attempt = 0;

  return {
    async play(userInitiated = false) {
      if (disposed || (!userInitiated && (status === 'blocked' || status === 'error'))) return;
      const currentAttempt = ++attempt;
      try {
        audio.currentTime = 0;
        // Invoke immediately so a button click retains browser user activation.
        await audio.play();
        if (disposed || currentAttempt !== attempt) return;
        status = 'ready';
        onStatus(status);
      } catch (error) {
        if (disposed || currentAttempt !== attempt || error.name === 'AbortError') return;
        status = error.name === 'NotAllowedError' ? 'blocked' : 'error';
        onStatus(status, error);
      }
    },
    dispose() {
      disposed = true;
      ++attempt;
      audio.pause();
    }
  };
}
