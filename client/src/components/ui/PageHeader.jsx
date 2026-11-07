export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header page-header-blue">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
