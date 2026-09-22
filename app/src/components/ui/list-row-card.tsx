import Link from "next/link";
import styles from "./list-row-card.module.css";

export function ListRowCard({
  title,
  subtitle,
  middle,
  trailing,
  href,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  middle?: React.ReactNode;
  trailing: React.ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <div>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className={styles.middle}>{middle}</div>
      <span className={styles.trailing}>{trailing}</span>
    </>
  );
  return href ? (
    <Link href={href} className={styles.row}>{content}</Link>
  ) : (
    <div className={styles.row}>{content}</div>
  );
}
