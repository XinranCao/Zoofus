import { useState } from "react";
import PageContainer from "../../components/PageContainer";
import ImageLassoPanel from "../../components/ImageLasso/ImageLassoPanel";
import styles from "./Home.module.less";

const HomePage = () => {
  const [showLasso, setShowLasso] = useState(false);

  return (
    <PageContainer>
      <div className={styles.homePageContainer}>
        {!showLasso ? (
          <div style={{ textAlign: "center" }}>
            <h1>Welcome to Zoofus!</h1>
            <button
              style={{
                padding: "16px 32px",
                fontSize: "1.2rem",
                borderRadius: "8px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                marginTop: "40px",
              }}
              onClick={() => setShowLasso(true)}
            >
              Start Image Lasso Selection
            </button>
          </div>
        ) : (
          <ImageLassoPanel />
        )}
      </div>
    </PageContainer>
  );
};

export default HomePage;
