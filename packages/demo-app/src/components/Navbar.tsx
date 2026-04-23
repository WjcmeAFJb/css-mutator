import styles from "../styles/navbar.module.css";

export function Navbar() {
  return (
    <nav className={styles.navbar}>
      <span className={styles.logo}>CSSMutator</span>
      <ul className={styles.navLinks}>
        <li>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
        </li>
        <li>
          <a href="#pricing" className={styles.navLink}>
            Pricing
          </a>
        </li>
        <li>
          <a href="#docs" className={styles.navLink}>
            Docs
          </a>
        </li>
      </ul>
    </nav>
  );
}
