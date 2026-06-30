'use client';

import { motion } from 'framer-motion';

// RSC는 'use client' 파일에서 React 컴포넌트 함수만 import할 수 있음.
// motion 네임스페이스 객체를 그대로 re-export하면 직렬화 불가 → undefined.
// 필요한 HTML 엘리먼트를 개별 named export로 꺼내서 RSC에서 사용.
export const MotionDiv = motion.div;
export const MotionSection = motion.section;
