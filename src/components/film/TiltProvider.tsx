'use client';

import { useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type TPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface ITiltContextValue {
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
  permissionState: TPermissionState;
  requestPermission: () => Promise<void>;
  isTouch: boolean;
}

const TiltContext = createContext<ITiltContextValue | null>(null);

export const useTilt = () => {
  const ctx = useContext(TiltContext);
  if (!ctx) throw new Error('useTilt must be used within a TiltProvider');
  return ctx;
};

const TILT_DEG = 15;
const SPRING_CONFIG = { stiffness: 260, damping: 24 };
// 자연스럽게 손에 들고 있을 때 beta(앞뒤 기울기)의 기준값 — 이 각도를 "중립"으로 보고
// 그로부터의 편차만 틸트에 반영. 실기기 테스트 후 조정이 필요할 수 있는 값.
const BETA_BASELINE = 45;
const TILT_RANGE_DEG = 30;
const UNSUPPORTED_TIMEOUT_MS = 1500;

interface ITiltProviderProps {
  children: ReactNode;
}

export const TiltProvider = ({ children }: ITiltProviderProps) => {
  // gamma(좌우 기울기) → rawX, beta(앞뒤 기울기, 기준값 대비 편차) → rawY, 둘 다 -1~1 정규화
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(useTransform(rawY, [-1, 1], [TILT_DEG, -TILT_DEG]), SPRING_CONFIG);
  const tiltY = useSpring(useTransform(rawX, [-1, 1], [-TILT_DEG, TILT_DEG]), SPRING_CONFIG);

  const [permissionState, setPermissionState] = useState<TPermissionState>('unknown');
  const [isTouch, setIsTouch] = useState(false);
  const listenerAttachedRef = useRef(false);
  const unsupportedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRequestingRef = useRef(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (unsupportedTimerRef.current) {
        clearTimeout(unsupportedTimerRef.current);
        unsupportedTimerRef.current = null;
      }
      setPermissionState('granted');
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? BETA_BASELINE;
      const normalizedX = Math.max(-1, Math.min(1, gamma / TILT_RANGE_DEG));
      const normalizedY = Math.max(-1, Math.min(1, (beta - BETA_BASELINE) / TILT_RANGE_DEG));
      rawX.set(normalizedX);
      rawY.set(normalizedY);
    },
    [rawX, rawY],
  );

  const attachListener = useCallback(() => {
    if (listenerAttachedRef.current) return;
    listenerAttachedRef.current = true;
    window.addEventListener('deviceorientation', handleOrientation);
    // 일정 시간 내 이벤트가 없으면 자이로스코프 미지원(또는 응답 없음)으로 간주
    unsupportedTimerRef.current = setTimeout(() => {
      setPermissionState((current) => (current === 'unknown' ? 'unsupported' : current));
    }, UNSUPPORTED_TIMEOUT_MS);
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    if (permissionState !== 'unknown' || isRequestingRef.current) return;
    isRequestingRef.current = true;

    // iOS 13+ Safari는 DeviceOrientationEvent.requestPermission이라는 정적 메서드를
    // 노출하며, 반드시 사용자 제스처(탭) 안에서 호출해야만 권한 다이얼로그가 뜬다.
    // TS DOM 타입에는 이 메서드가 없어 캐스팅이 필요함 — 알려진 타입 간극.
    const OrientationEventWithPermission = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof OrientationEventWithPermission?.requestPermission === 'function') {
      try {
        const result = await OrientationEventWithPermission.requestPermission();
        if (result === 'granted') {
          attachListener();
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      } finally {
        isRequestingRef.current = false;
      }
      return;
    }

    // iOS 13+ 외 브라우저(Android 등)는 명시적 권한 요청 API가 없으므로 바로 리스너 부착
    attachListener();
    isRequestingRef.current = false;
  }, [permissionState, attachListener]);

  useEffect(() => {
    return () => {
      if (listenerAttachedRef.current) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      if (unsupportedTimerRef.current) clearTimeout(unsupportedTimerRef.current);
    };
  }, [handleOrientation]);

  const contextValue = useMemo(
    () => ({ tiltX, tiltY, permissionState, requestPermission, isTouch }),
    [tiltX, tiltY, permissionState, requestPermission, isTouch],
  );

  return (
    <TiltContext.Provider value={contextValue}>
      {children}
    </TiltContext.Provider>
  );
};
