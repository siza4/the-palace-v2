"use client";

import { Howl } from "howler";
import { useEffect } from "react";

export function AudioEngine() {
  useEffect(() => {
    const sound = new Howl({
      src: ["/sounds/ambient.mp3"],
      loop: true,
      volume: 0.4,
    });

    sound.play();
  }, []);

  return null;
}
