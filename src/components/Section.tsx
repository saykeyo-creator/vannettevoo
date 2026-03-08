interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export default function Section({ children, className = "", id }: SectionProps) {
  return (
    <section id={id} className={`px-4 py-12 md:py-16 ${className}`}>
      <div className="max-w-3xl mx-auto">{children}</div>
    </section>
  );
}

export function SectionHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-2xl md:text-3xl font-bold text-slate-900 tracking-tight ${className}`}
    >
      {children}
    </h2>
  );
}

export function SectionSubtext({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-3 text-base text-slate-500 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}
