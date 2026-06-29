// 영화 포스터의 blur placeholder를 서버에서 생성하는 유틸리티
// TMDB w45 이미지를 fetch → base64로 변환 → next/image blurDataURL에 사용

// 빌드/서버 실행 중 블러 생성 실패 시 사용하는 기본 단색 플레이스홀더 (1×1 회색 PNG)
export const FALLBACK_BLUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const getPosterBlurDataUrl = async (posterPath: string | null): Promise<string> => {
  if (!posterPath) return FALLBACK_BLUR;

  try {
    const res = await fetch(`https://image.tmdb.org/t/p/w45${posterPath}`, {
      // 블러 이미지 자체는 오래 캐싱해도 무방
      next: { revalidate: 86400 },
    });
    if (!res.ok) return FALLBACK_BLUR;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return FALLBACK_BLUR;
  }
};
