type PageHeaderProps = {
  title: string;
  description: string;
};

/** Judul dan deskripsi yang dipakai seragam di semua halaman. */
export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-neutral-600">{description}</p>
    </div>
  );
}