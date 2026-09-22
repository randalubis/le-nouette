import Link from "next/link";
import styles from "./metric-card.module.css";

export function MetricCard({
  href,
  label,
  value,
  hint,
  variant = "neutral",
  alert = false,
  compact = false,
}: {
  href?: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  variant?: "neutral" | "hero";
  alert?: boolean;
  compact?: boolean;
}) {
  const className = `${styles.card} ${styles[variant]} ${alert ? styles.alert : ""} ${compact ? styles.compact : ""}`;
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </>
  );
  return href ? (
    <Link href={href} className={className}>{content}</Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
