type InfoCardProps = {
  title: string;
  items: string[];
};

/** Kartu daftar sederhana untuk menjelaskan satu topik. */
export default function InfoCard({ title, items }: InfoCardProps) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}