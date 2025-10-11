"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({
  onComplete,
  duration = 3000,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [animationStage, setAnimationStage] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true);

    const timer1 = setTimeout(() => setAnimationStage(1), 200);
    const timer2 = setTimeout(() => setAnimationStage(2), 800);
    const timer3 = setTimeout(() => setAnimationStage(3), 1500);
    const timer4 = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 400);
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [duration, onComplete]);

  // Don't render anything until we're on the client
  if (!isClient) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Animated Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600"
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => {
            // Use deterministic values based on index to avoid hydration mismatch
            const seedX1 = (i * 123.45 + 100) % 1200;
            const seedY1 = (i * 67.89 + 200) % 800;
            const seedX2 = ((i + 10) * 98.76 + 150) % 1200;
            const seedY2 = ((i + 5) * 43.21 + 300) % 800;
            const duration = (i % 3) + 2; // 2, 3, or 4 seconds
            const delay = (i % 4) * 0.5; // 0, 0.5, 1, 1.5 seconds

            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-60"
                initial={{
                  x: seedX1,
                  y: seedY1,
                  opacity: 0,
                }}
                animate={{
                  x: seedX2,
                  y: seedY2,
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: duration,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: delay,
                }}
              />
            );
          })}

          {/* Ocean Wave Animations - Multiple Layers */}
          <motion.div
            className="absolute bottom-0 w-full h-40 md:h-56 lg:h-72 xl:h-80 opacity-20"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 0.2 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          >
            {/* Wave Layer 1 */}
            <motion.svg
              className="absolute bottom-0 w-full h-32 md:h-44 lg:h-56 xl:h-64"
              viewBox="0 0 1440 320"
              xmlns="http://www.w3.org/2000/svg"
              animate={{ x: [-20, 20, -20] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <path
                d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                fill="#3b82f6"
                opacity="0.6"
              />
            </motion.svg>

            {/* Wave Layer 2 */}
            <motion.svg
              className="absolute bottom-0 w-full h-24 md:h-32 lg:h-40 xl:h-48"
              viewBox="0 0 1440 320"
              xmlns="http://www.w3.org/2000/svg"
              animate={{ x: [20, -20, 20] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <path
                d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,213.3C672,203,768,149,864,149.3C960,149,1056,203,1152,202.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                fill="#60a5fa"
                opacity="0.4"
              />
            </motion.svg>

            {/* Wave Layer 3 */}
            <motion.svg
              className="absolute bottom-0 w-full h-16 md:h-20 lg:h-24 xl:h-32"
              viewBox="0 0 1440 320"
              xmlns="http://www.w3.org/2000/svg"
              animate={{ x: [-15, 15, -15] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            >
              <path
                d="M0,256L48,245.3C96,235,192,213,288,218.7C384,224,480,256,576,245.3C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                fill="#93c5fd"
                opacity="0.3"
              />
            </motion.svg>
          </motion.div>

          {/* Main Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center text-white">
            {/* Logo Container */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: animationStage >= 1 ? 1 : 0,
                rotate: animationStage >= 1 ? 0 : -180,
              }}
              transition={{
                duration: 1.2,
                type: "spring",
                stiffness: 100,
                damping: 15,
              }}
            >
              {/* Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: animationStage >= 1 ? [0, 0.6, 0.3] : 0,
                  scale: animationStage >= 1 ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  background:
                    "radial-gradient(circle, rgba(59, 130, 246, 0.8), transparent 70%)",
                  width: "200px",
                  height: "200px",
                }}
              />

              {/* Logo */}
              <motion.div
                className="relative z-10 w-32 h-32 sm:w-40 sm:h-40"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Image
                  src="/logo.svg"
                  alt="FloatChat Logo"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </motion.div>

              {/* Orbiting Elements - Data Points */}
              {[...Array(6)].map((_, i) => {
                const angle = i * 60; // 60 degrees apart
                const radius = 60 + i * 10; // Increasing radius
                const x1 = Math.cos(angle * (Math.PI / 180)) * radius;
                const y1 = Math.sin(angle * (Math.PI / 180)) * radius;
                const x2 = Math.cos((angle + 360) * (Math.PI / 180)) * radius;
                const y2 = Math.sin((angle + 360) * (Math.PI / 180)) * radius;

                return (
                  <motion.div
                    key={i}
                    className="absolute flex items-center justify-center"
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 0,
                      scale: 0,
                    }}
                    animate={
                      animationStage >= 2
                        ? {
                            x: [x1, x2],
                            y: [y1, y2],
                            opacity: [0, 0.8, 0.8, 0.3],
                            scale: [0, 1, 1, 0.5],
                          }
                        : {}
                    }
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.3,
                    }}
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="w-2 h-2 bg-blue-300 rounded-full">
                      <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Title */}
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: animationStage >= 2 ? 1 : 0,
                y: animationStage >= 2 ? 0 : 20,
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            >
              <motion.h1
                className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: animationStage >= 2 ? 1 : 0 }}
                transition={{ duration: 1.2, delay: 0.5 }}
              >
                FloatChat
              </motion.h1>
              <motion.p
                className="text-blue-200 text-lg sm:text-xl font-light"
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: animationStage >= 2 ? 1 : 0,
                  y: animationStage >= 2 ? 0 : 10,
                }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                Exploring Ocean Data with AI
              </motion.p>
            </motion.div>

            {/* Loading Animation */}
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{
                opacity: animationStage >= 3 ? 1 : 0,
              }}
              transition={{ duration: 0.5 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-blue-300 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              className="mt-8 w-64 h-1 bg-blue-900 rounded-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: animationStage >= 3 ? 1 : 0,
                scale: animationStage >= 3 ? 1 : 0.8,
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-200 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: duration / 1000 - 0.5,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              />
            </motion.div>
          </div>

          {/* Skip Button */}
          {/* <motion.button
            className="absolute top-4 right-4 z-20 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-lg text-blue-200 text-sm hover:bg-blue-500/30 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: animationStage >= 2 ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onComplete?.(), 300);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Skip
          </motion.button> */}

          {/* Click Anywhere Hint */}
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-blue-200/60 text-sm cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{
              opacity: animationStage >= 3 ? [0, 0.6, 0] : 0,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 2,
            }}
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onComplete?.(), 300);
            }}
          >
            Click anywhere to continue
          </motion.div>

          {/* Interactive Click Area */}
          <motion.div
            className="absolute inset-0 cursor-pointer"
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onComplete?.(), 300);
            }}
            whileHover={{ scale: 1.001 }}
            whileTap={{ scale: 0.999 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
