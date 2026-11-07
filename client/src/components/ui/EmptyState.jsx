export default function EmptyState({ title = "Nothing here yet", description }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
