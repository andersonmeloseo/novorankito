interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
