type PageHeaderProps = {
  title: string;
  description: string;
};

/** Judul dan deskripsi yang dipakai seragam di semua halaman. */
export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-brand-text sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 sm:text-base">{description}</p>
    </div>
  );
}
