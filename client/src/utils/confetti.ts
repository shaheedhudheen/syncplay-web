import confetti from 'canvas-confetti';

/**
 * Triggers a beautiful floating emoji particle burst across the screen
 */
export function triggerEmojiConfetti(emoji: string, originX?: number, originY?: number) {
  try {
    const scalar = 2.5;
    const shape = confetti.shapeFromText({ text: emoji, scalar });

    confetti({
      shapes: [shape],
      scalar,
      particleCount: 18,
      spread: 75,
      startVelocity: 35,
      decay: 0.92,
      origin: {
        x: originX !== undefined ? originX : 0.5,
        y: originY !== undefined ? originY : 0.75,
      },
      ticks: 200,
      gravity: 0.7,
      disableForReducedMotion: true,
      zIndex: 99999,
    });
  } catch (err) {
    console.error('Failed to trigger emoji confetti:', err);
  }
}
