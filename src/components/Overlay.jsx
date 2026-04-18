import React from 'react';
import { motion } from 'framer-motion';

export const Overlay = ({ onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30"
    />
  );
};
