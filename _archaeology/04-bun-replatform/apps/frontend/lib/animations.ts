// Framer Motion animation variants

import type { Variants } from 'framer-motion';

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15 } },
};

export const slideIn: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 20,
        },
    },
};

export const resultCardVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 200,
            damping: 20,
        },
    },
    exit: {
        opacity: 0,
        x: 20,
        transition: { duration: 0.15 },
    },
};

export const glowPulse: Variants = {
    initial: {
        boxShadow: '0 0 20px rgba(88, 166, 255, 0.4)',
    },
    animate: {
        boxShadow: [
            '0 0 20px rgba(88, 166, 255, 0.4)',
            '0 0 30px rgba(88, 166, 255, 0.6)',
            '0 0 20px rgba(88, 166, 255, 0.4)',
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};
