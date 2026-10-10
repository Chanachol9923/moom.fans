"use client";
import { useEffect, useState } from "react";
import type { PetSprite } from "@/lib/pets/sprites";
import { PixelSprite } from "./PixelSprite";

export function AnimatedSprite({ sprite, size = 64, sleeping = false }: { sprite: PetSprite; size?: number; sleeping?: boolean }) {
  const [step, setStep] = useState(false);
  useEffect(() => {
    if (sleeping) return;
    const id = setInterval(() => setStep((s) => !s), 260);
    return () => clearInterval(id);
  }, [sleeping]);
  return <PixelSprite sprite={sprite} size={size} frame={sleeping ? "sleep" : step ? "step" : "stand"} />;
}
