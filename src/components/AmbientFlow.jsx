import { motion, useReducedMotion } from 'framer-motion';

const FLOW_FIELDS = [
  {
    className: 'absolute -left-40 -top-32 h-[30rem] w-[30rem]',
    color: 'rgba(34, 211, 238, 0.20)',
    duration: 22,
    x: [0, 72, 26, 0],
    y: [0, 28, 74, 0],
    scale: [1, 1.12, 0.96, 1],
  },
  {
    className: 'absolute -bottom-48 -right-40 h-[34rem] w-[34rem]',
    color: 'rgba(129, 140, 248, 0.17)',
    duration: 26,
    x: [0, -62, -20, 0],
    y: [0, -42, -82, 0],
    scale: [1.04, 0.94, 1.12, 1.04],
  },
  {
    className: 'absolute left-[28%] top-[34%] h-[24rem] w-[24rem]',
    color: 'rgba(45, 212, 191, 0.12)',
    duration: 30,
    x: [0, -44, 38, 0],
    y: [0, 54, -36, 0],
    scale: [0.96, 1.1, 0.92, 0.96],
  },
];

export default function AmbientFlow() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {FLOW_FIELDS.map((field, index) => (
        <motion.div
          key={field.className}
          className={`${field.className} rounded-full`}
          style={{
            background: `radial-gradient(circle, ${field.color} 0%, transparent 70%)`,
            filter: 'blur(54px)',
            willChange: prefersReducedMotion ? 'auto' : 'transform',
          }}
          animate={prefersReducedMotion
            ? { opacity: 0.7, x: 0, y: 0, scale: 1 }
            : { opacity: [0.55, 0.9, 0.65, 0.55], x: field.x, y: field.y, scale: field.scale }}
          transition={prefersReducedMotion
            ? { duration: 0 }
            : { duration: field.duration, repeat: Infinity, ease: 'easeInOut', delay: index * -4 }}
        />
      ))}
    </div>
  );
}
