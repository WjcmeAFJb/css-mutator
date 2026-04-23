import styles from "../styles/card.module.css";

const cards = [
  {
    icon: "\u{1F9EC}",
    title: "12 Mutation Operators",
    description:
      "Comprehensive CSS mutations covering colors, sizes, layout, typography, spacing, and more.",
  },
  {
    icon: "\u{1F4F8}",
    title: "Screenshot Testing",
    description:
      "Works with Vitest browser mode and Playwright for pixel-perfect visual regression testing.",
  },
  {
    icon: "\u{26A1}",
    title: "Vite Integration",
    description:
      "Seamless Vite plugin intercepts CSS at build time. No configuration needed for CSS modules.",
  },
  {
    icon: "\u{1F4CA}",
    title: "Coverage Reports",
    description:
      "See mutation coverage directly on your CSS source files, just like JavaScript coverage.",
  },
  {
    icon: "\u{1F50C}",
    title: "Incremental Cache",
    description:
      "Skip unchanged CSS on re-runs. The cache keys on both CSS and test file hashes.",
  },
  {
    icon: "\u{1F6E0}",
    title: "CLI & Programmatic",
    description:
      "Run from the command line or integrate programmatically into your build pipeline.",
  },
];

export function CardGrid() {
  return (
    <section className={styles.section} id="features" role="region" aria-label="features">
      <h2 className={styles.sectionTitle}>Features</h2>
      <div className={styles.grid}>
        {cards.map((card) => (
          <div key={card.title} className={styles.card}>
            <div className={styles.cardIcon}>{card.icon}</div>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardDescription}>{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
