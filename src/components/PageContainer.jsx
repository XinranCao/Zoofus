import styles from "./PageContainer.module.less";

const PageContainer = ({ children }) => (
  <div className={styles.pageContainer}>{children}</div>
);

export default PageContainer;
