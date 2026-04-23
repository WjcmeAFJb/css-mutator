import styles from "../styles/footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <h3 className={styles.brand}>CSSMutator</h3>
          <p className={styles.brandDescription}>
            Mutation testing for your stylesheets. Find untested CSS and improve your visual test
            coverage.
          </p>
        </div>
        <div>
          <h4 className={styles.columnTitle}>Product</h4>
          <ul className={styles.columnLinks}>
            <li>
              <a href="#" className={styles.columnLink}>
                Features
              </a>
            </li>
            <li>
              <a href="#" className={styles.columnLink}>
                Pricing
              </a>
            </li>
            <li>
              <a href="#" className={styles.columnLink}>
                Changelog
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={styles.columnTitle}>Docs</h4>
          <ul className={styles.columnLinks}>
            <li>
              <a href="#" className={styles.columnLink}>
                Getting Started
              </a>
            </li>
            <li>
              <a href="#" className={styles.columnLink}>
                API Reference
              </a>
            </li>
            <li>
              <a href="#" className={styles.columnLink}>
                Examples
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={styles.columnTitle}>Community</h4>
          <ul className={styles.columnLinks}>
            <li>
              <a href="#" className={styles.columnLink}>
                GitHub
              </a>
            </li>
            <li>
              <a href="#" className={styles.columnLink}>
                Discord
              </a>
            </li>
            <li>
              <a href="#" className={styles.columnLink}>
                Twitter
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className={styles.copyright}>&copy; 2026 CSSMutator. Built with Vite + React.</p>
    </footer>
  );
}
