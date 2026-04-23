import styles from "./Card.module.css";

interface CardProps {
  title: string;
  body: string;
}

export function Card({ title, body }: CardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
    </div>
  );
}
