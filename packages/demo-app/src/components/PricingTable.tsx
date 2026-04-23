import styles from "../styles/pricing.module.css";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    features: ["5 CSS files", "Basic mutators", "Console reporter", "Community support"],
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: [
      "Unlimited files",
      "All 12 mutators",
      "HTML + JSON reports",
      "CSS coverage view",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "/month",
    features: [
      "Everything in Pro",
      "CI/CD integration",
      "Parallel execution",
      "Custom mutators",
      "Dedicated support",
    ],
    featured: false,
  },
];

export function PricingTable() {
  return (
    <section className={styles.section} id="pricing" role="region" aria-label="pricing">
      <h2 className={styles.title}>Pricing</h2>
      <div className={styles.grid}>
        {plans.map((plan) => (
          <div key={plan.name} className={plan.featured ? styles.planFeatured : styles.plan}>
            {plan.featured && <span className={styles.featuredBadge}>Most Popular</span>}
            <p className={styles.planName}>{plan.name}</p>
            <p className={styles.planPrice}>{plan.price}</p>
            <p className={styles.planPeriod}>{plan.period}</p>
            <ul className={styles.featureList}>
              {plan.features.map((feature) => (
                <li key={feature} className={styles.feature}>
                  <span className={styles.featureCheck}>{"\u2713"}</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button className={plan.featured ? styles.planButtonPrimary : styles.planButton}>
              {plan.featured ? "Start Free Trial" : "Get Started"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
