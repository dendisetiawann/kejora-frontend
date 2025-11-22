import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

export default function DashboardPage() {
  const menuItems = [
    {
      title: 'Kelola Pesanan',
      description: 'Pantau dan update status pesanan pelanggan',
      icon: 'fa-clipboard-list',
      href: '/admin/orders',
    },
    {
      title: 'Kelola Menu',
      description: 'Update harga, foto, dan ketersediaan menu',
      icon: 'fa-mug-hot',
      href: '/admin/menus',
    },
    {
      title: 'Kelola Kategori',
      description: 'Atur pengelompokan menu cafe',
      icon: 'fa-layer-group',
      href: '/admin/categories',
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Selamat Datang, Admin</h1>
          <p className="text-gray-500">Silakan pilih menu untuk mulai mengelola cafe.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:border-brand-accent/30 transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="h-20 w-20 rounded-full bg-brand-light flex items-center justify-center text-3xl mb-6 text-brand-dark group-hover:bg-brand-dark group-hover:text-brand-accent transition-colors duration-300">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <h3 className="text-xl font-bold text-brand-dark mb-2 group-hover:text-brand-accent transition-colors">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
