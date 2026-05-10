export default function SectionTitle({
  kicker, title, action, inline = false,
}: {
  kicker: string;
  title: string;
  action?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between ${inline ? 'mb-3' : 'mb-4'}`}>
      <div>
        <div className="kicker">{kicker}</div>
        <h2 className="headline text-xl text-fg mt-1">{title}</h2>
      </div>
      {action}
    </div>
  );
}
