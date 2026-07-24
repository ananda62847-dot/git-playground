import React from 'react';
import { motion } from 'framer-motion';

interface FormStepProps {
  children: React.ReactNode;
  isActive: boolean;
}

const FormStep: React.FC<FormStepProps> = ({ children, isActive }) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default FormStep;
