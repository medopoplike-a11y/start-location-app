"use client";

import { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from '@tsparticles/slim';
import { Engine } from '@tsparticles/engine';

interface ParticlesBackgroundProps {
  theme?: 'neon-blue' | 'neon-purple' | 'fire-orange';
}

export default function ParticlesBackground({ theme = 'neon-blue' }: ParticlesBackgroundProps) {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const neonOptions = {
    background: {
      color: {
        value: 'transparent',
      },
    },
    fpsLimit: 60,
    particles: {
      number: {
        value: 80,
        density: {
          enable: true,
          value_area: 800,
        },
      },
      color: {
        value: theme === 'neon-blue' ? '#00f5ff' : theme === 'neon-purple' ? '#8b5cf6' : '#f97316',
      },
      shape: {
        type: 'circle',
      },
      opacity: {
        value: 0.3,
        random: true,
        anim: {
          enable: true,
          speed: 1,
          opacity_min: 0.1,
          sync: false,
        },
      },
      size: {
        value: 3,
        random: true,
        anim: {
          enable: true,
          speed: 2,
          size_min: 0.1,
          sync: false,
        },
      },
      links: {
        enable: true,
        distance: 150,
        color: theme === 'neon-blue' ? '#00f5ff' : theme === 'neon-purple' ? '#8b5cf6' : '#f97316',
        opacity: 0.2,
        width: 1,
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: false,
        attract: {
          enable: false,
        },
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: true,
          mode: 'grab',
        },
        onclick: {
          enable: true,
          mode: 'push',
        },
        resize: true,
      },
      modes: {
        grab: {
          distance: 200,
          links: {
            opacity: 0.5,
          },
        },
        push: {
          quantity: 4,
        },
      },
    },
    retina_detect: true,
    fullScreen: {
      enable: false,
      zIndex: -1,
    },
  };

  return (
    <Particles
      id='tsparticles-neon'
      init={particlesInit}
      options={neonOptions}
      className='fixed inset-0 z-0 pointer-events-none'
    />
  );
}

