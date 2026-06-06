import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const password = await bcrypt.hash('password123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@system.com' },
    update: {},
    create: { email: 'superadmin@system.com', password, role: 'SUPER_ADMIN', isActive: true, isVerified: true },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: { email: 'admin@system.com', password, role: 'ADMIN', isActive: true, isVerified: true },
  });

  const finance = await prisma.user.upsert({
    where: { email: 'finance@system.com' },
    update: {},
    create: { email: 'finance@system.com', password, role: 'FINANCE', isActive: true, isVerified: true },
  });

  const affiliateUser = await prisma.user.upsert({
    where: { email: 'affiliate@system.com' },
    update: {},
    create: { email: 'affiliate@system.com', password, role: 'AFFILIATE', isActive: true, isVerified: true },
  });

  const kandidatUser = await prisma.user.upsert({
    where: { email: 'kandidat@system.com' },
    update: {},
    create: { email: 'kandidat@system.com', password, role: 'KANDIDAT', isActive: true, isVerified: true },
  });

  // Create affiliate
  const affiliate = await prisma.affiliate.upsert({
    where: { userId: affiliateUser.id },
    update: {},
    create: {
      userId: affiliateUser.id,
      code: 'AFF001',
      referralLink: 'http://localhost:5173/register?ref=AFF001',
      bankName: 'BCA',
      bankAccount: '1234567890',
      bankHolder: 'John Affiliate',
      totalClicks: 128,
      totalRegistrations: 24,
      totalPaid: 10,
      totalCommission: 5000000,
    },
  });

  // Create candidate
  await prisma.candidate.upsert({
    where: { userId: kandidatUser.id },
    update: {},
    create: {
      userId: kandidatUser.id,
      nik: '3201234567890001',
      fullName: 'Budi Santoso',
      birthPlace: 'Jakarta',
      birthDate: new Date('1998-05-15'),
      gender: 'LAKI_LAKI',
      maritalStatus: 'BELUM_MENIKAH',
      address: 'Jl. Merdeka No. 10',
      kecamatan: 'Bogor Tengah',
      kabupaten: 'Kota Bogor',
      provinsi: 'Jawa Barat',
      lastEducation: 'SMA',
      graduationYear: 2016,
      height: 170,
      weight: 65,
      bloodType: 'O',
      clothingSize: 'M',
      phone: '081234567890',
      referredBy: 'AFF001',
    },
  });

  // Categories
  const categories = await Promise.all([
    prisma.programCategory.upsert({
      where: { slug: 'kerja-jepang' },
      update: {},
      create: { name: 'Kerja ke Jepang', slug: 'kerja-jepang', icon: '🇯🇵' },
    }),
    prisma.programCategory.upsert({
      where: { slug: 'kerja-korea' },
      update: {},
      create: { name: 'Kerja ke Korea', slug: 'kerja-korea', icon: '🇰🇷' },
    }),
    prisma.programCategory.upsert({
      where: { slug: 'magang-jerman' },
      update: {},
      create: { name: 'Magang ke Jerman', slug: 'magang-jerman', icon: '🇩🇪' },
    }),
    prisma.programCategory.upsert({
      where: { slug: 'pelatihan-kerja' },
      update: {},
      create: { name: 'Pelatihan Kerja', slug: 'pelatihan-kerja', icon: '📚' },
    }),
  ]);

  // Programs
  await prisma.program.upsert({
    where: { slug: 'program-tokutei-ginou-jepang-2024' },
    update: {},
    create: {
      name: 'Program Tokutei Ginou Jepang 2024',
      slug: 'program-tokutei-ginou-jepang-2024',
      categoryId: categories[0].id,
      description: 'Program penempatan kerja ke Jepang bidang manufaktur dan konstruksi dengan visa Tokutei Ginou. Kandidat akan mendapatkan pelatihan bahasa Jepang selama 3 bulan sebelum keberangkatan.',
      requirements: 'Usia 18-35 tahun\nTinggi minimal 160cm\nSehat jasmani dan rohani\nBelum pernah ke Jepang sebelumnya',
      benefits: 'Gaji minimal ¥180,000/bulan\nAkomodasi disediakan perusahaan\nAsuransi kesehatan\nCuti 10 hari/tahun',
      quota: 50,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-02-01'),
      fee: 12500000,
      affiliateCommission: 500000,
      commissionType: 'FIXED',
      country: 'Jepang',
      duration: '3 Tahun',
      status: 'AKTIF',
      isFeatured: true,
    },
  });

  await prisma.program.upsert({
    where: { slug: 'program-eps-topik-korea-2024' },
    update: {},
    create: {
      name: 'Program EPS-TOPIK Korea 2024',
      slug: 'program-eps-topik-korea-2024',
      categoryId: categories[1].id,
      description: 'Program penempatan tenaga kerja ke Korea Selatan melalui sistem EPS-TOPIK resmi pemerintah. Bidang manufaktur, pertanian, dan perikanan.',
      requirements: 'Usia 18-39 tahun\nLulus ujian EPS-TOPIK\nTidak pernah dideportasi dari Korea',
      benefits: 'Gaji sesuai UMK Korea\nKontrak kerja 4 tahun 10 bulan\nBiaya tiket ditanggung',
      quota: 30,
      startDate: new Date('2024-04-01'),
      fee: 8500000,
      affiliateCommission: 350000,
      commissionType: 'FIXED',
      country: 'Korea Selatan',
      duration: '4 Tahun 10 Bulan',
      status: 'AKTIF',
      isFeatured: true,
    },
  });

  await prisma.program.upsert({
    where: { slug: 'magang-jerman-hospitality-2024' },
    update: {},
    create: {
      name: 'Magang Jerman - Hospitality & Kuliner',
      slug: 'magang-jerman-hospitality-2024',
      categoryId: categories[2].id,
      description: 'Program magang bersertifikat ke Jerman di bidang perhotelan dan kuliner. Mendapatkan sertifikat internasional yang diakui di seluruh Eropa.',
      requirements: 'Usia 18-28 tahun\nD3/S1 Perhotelan atau Pariwisata\nBahasa Inggris aktif',
      benefits: 'Uang saku €700-900/bulan\nAkomodasi gratis\nSertifikat internasional\nPeluang kerja tetap',
      quota: 20,
      fee: 15000000,
      affiliateCommission: 750000,
      commissionType: 'FIXED',
      country: 'Jerman',
      duration: '1 Tahun',
      status: 'AKTIF',
      isFeatured: false,
    },
  });

  // Testimonials
  await prisma.testimonial.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Ahmad Fauzi', position: 'Pekerja di Toyota Japan', content: 'Alhamdulillah sudah 2 tahun bekerja di Jepang. Proses pendaftaran sangat mudah dan transparan. Tim sangat membantu dari awal hingga keberangkatan.', rating: 5, isActive: true, sortOrder: 1 },
      { name: 'Siti Rahayu', position: 'Pekerja di Korea Selatan', content: 'Awalnya ragu, tapi setelah mendaftar ternyata prosesnya profesional. Sekarang sudah kirim uang ke keluarga setiap bulan. Terima kasih!', rating: 5, isActive: true, sortOrder: 2 },
      { name: 'Dedi Kurniawan', position: 'Magang di Jerman', content: 'Pengalaman magang di Jerman sangat luar biasa. Ilmu yang didapat tidak ternilai harganya. Proses visa dibantu penuh oleh tim.', rating: 5, isActive: true, sortOrder: 3 },
    ],
  });

  // FAQs
  await prisma.fAQ.createMany({
    skipDuplicates: true,
    data: [
      { question: 'Apa saja persyaratan umum untuk mendaftar?', answer: 'Persyaratan umum meliputi: KTP valid, KK, ijazah terakhir, paspor (jika sudah ada), surat keterangan sehat, dan tidak memiliki catatan kriminal.', category: 'Pendaftaran', isActive: true, sortOrder: 1 },
      { question: 'Berapa lama proses pendaftaran hingga keberangkatan?', answer: 'Proses rata-rata memakan waktu 3-6 bulan tergantung program yang dipilih, mulai dari pendaftaran, seleksi, pelatihan bahasa, hingga pengurusan visa dan dokumen keberangkatan.', category: 'Proses', isActive: true, sortOrder: 2 },
      { question: 'Bagaimana sistem pembayaran biaya program?', answer: 'Pembayaran dapat dilakukan via transfer bank. Upload bukti transfer melalui sistem kami dan tim finance akan memverifikasi dalam 1x24 jam.', category: 'Pembayaran', isActive: true, sortOrder: 3 },
      { question: 'Apakah ada program cicilan?', answer: 'Tersedia program cicilan untuk beberapa program tertentu. Hubungi tim kami untuk informasi lebih lanjut mengenai skema cicilan yang tersedia.', category: 'Pembayaran', isActive: true, sortOrder: 4 },
      { question: 'Bagaimana cara menjadi affiliate?', answer: 'Daftar sebagai affiliate melalui menu "Daftar Affiliate" di dashboard. Setelah disetujui, Anda akan mendapatkan kode referral dan link unik untuk dibagikan.', category: 'Affiliate', isActive: true, sortOrder: 5 },
    ],
  });

  // Settings
  const defaultSettings = [
    { key: 'site_name', value: 'KerjaNusantara', group: 'GENERAL' },
    { key: 'site_tagline', value: 'Wujudkan Impian Kerja Luar Negeri Anda', group: 'GENERAL' },
    { key: 'site_email', value: 'info@kerjanusantara.com', group: 'GENERAL' },
    { key: 'site_phone', value: '+62-21-12345678', group: 'GENERAL' },
    { key: 'site_address', value: 'Jl. Sudirman No. 123, Jakarta Pusat', group: 'GENERAL' },
    { key: 'ocr_auto_verify_threshold', value: '85', group: 'OCR' },
    { key: 'affiliate_min_withdrawal', value: '500000', group: 'AFFILIATE' },
    { key: 'bank_name', value: 'BCA', group: 'PAYMENT' },
    { key: 'bank_account', value: '1234567890', group: 'PAYMENT' },
    { key: 'bank_holder', value: 'PT KerjaNusantara Indonesia', group: 'PAYMENT' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('  Super Admin : superadmin@system.com / password123');
  console.log('  Admin       : admin@system.com / password123');
  console.log('  Finance     : finance@system.com / password123');
  console.log('  Affiliate   : affiliate@system.com / password123');
  console.log('  Kandidat    : kandidat@system.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
