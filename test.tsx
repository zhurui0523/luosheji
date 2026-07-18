import { motion } from 'motion/react';
export default function Test() {
  return <motion.div animate={{ x: 0, transitionEnd: { transform: "none" } }} />
}
