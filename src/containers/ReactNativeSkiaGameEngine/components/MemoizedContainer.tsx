import { FC, memo, PropsWithChildren } from "react";

export const MemoizedContainer: FC<PropsWithChildren> = memo(({ children }) => {
  return <>{children}</>;
});
