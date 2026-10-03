import type { ReactNode } from "react";
import styles from "./PageContainer.module.less";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={styles.pageContainer}>{children}</div>;
}
