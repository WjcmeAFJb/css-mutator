import styles from "./Button.module.css";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "danger";
}

export function Button({ children, variant = "primary" }: ButtonProps) {
  const className = variant === "danger" ? `${styles.button} ${styles.danger}` : styles.button;

  return <button className={className}>{children}</button>;
}
