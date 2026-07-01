import type { ReactNode } from 'react';

// (browse) 레이아웃 — @modal 슬롯을 받아 children(그리드) 위에 overlay로 렌더
// 병렬 라우트: children과 modal은 같은 React 트리 안에서 동시에 렌더됨
export default function BrowseLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
