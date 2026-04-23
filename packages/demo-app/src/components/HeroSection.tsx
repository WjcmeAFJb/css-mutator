import styles from "../styles/hero.module.css";

interface HeroSectionProps {
  onAction: () => void;
}

export function HeroSection({ onAction }: HeroSectionProps) {
  return (
    <section className={styles.hero} role="region" aria-label="hero">
      <h1 className={styles.title}>CSS Mutation Testing</h1>
      <p className={styles.subtitle}>
        Find untested visual styles in your CSS. Catch layout bugs, color contrast issues, and
        styling regressions before your users do.
      </p>
      <button className={styles.ctaButton} onClick={onAction}>
        Get Started
      </button>
    </section>
  );
}
