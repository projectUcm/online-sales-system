// Foto y categoría por producto exacto del catálogo (no por coincidencia de palabras),
// para que cada producto muestre siempre una imagen coherente con su marca/diseño real.
const PRODUCT_IMAGE_IDS: Record<string, string> = {
  'Notebook Gamer RTX 4060': '30459254',
  'Mouse Logitech G502 X': '1486294',
  'Monitor Samsung 27" QHD': '20648391',
  'Teclado Mecánico RGB HyperX': '33888380',
  'Auriculares Sony WH-1000XM5': '33174697',
  'Webcam Logitech C920 HD': '7172701',
  'SSD Samsung 1TB NVMe': '2942361',
  'RAM Corsair Vengeance 16GB': '37113175',
  'Silla Gamer DXRacer Pro': '7862645',
  'Mousepad XL RGB Razer': '28779688',
};

const PRODUCT_CATEGORIES: Record<string, string> = {
  'Notebook Gamer RTX 4060': 'Laptops',
  'Mouse Logitech G502 X': 'Periféricos',
  'Monitor Samsung 27" QHD': 'Monitores',
  'Teclado Mecánico RGB HyperX': 'Periféricos',
  'Auriculares Sony WH-1000XM5': 'Audio',
  'Webcam Logitech C920 HD': 'Video',
  'SSD Samsung 1TB NVMe': 'Almacenamiento',
  'RAM Corsair Vengeance 16GB': 'Componentes',
  'Silla Gamer DXRacer Pro': 'Mobiliario',
  'Mousepad XL RGB Razer': 'Accesorios',
};

const FALLBACK_ID = '325153';

export function getProductImage(name: string, width = 500): string {
  const id = PRODUCT_IMAGE_IDS[name] ?? FALLBACK_ID;
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

export function getProductCategory(name: string): string {
  return PRODUCT_CATEGORIES[name] ?? 'Tecnología';
}
