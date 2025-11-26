import { GlassCategory, Product, Testimonial } from './types';

export const COMPANY_INFO = {
  name: "HOÀNG PHÚC GLASS",
  slogan: "Vững bền theo thời gian - Sang trọng từng chi tiết",
  address: "123 Đường Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh",
  phone: "0909 123 456",
  email: "sales@hoangphucglass.vn",
  workingHours: "Thứ 2 - Thứ 7: 8:00 - 17:30"
};

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Kính Cường Lực 10mm - 12mm',
    category: GlassCategory.TEMPERED,
    priceRange: '550.000đ - 850.000đ / m²',
    description: 'Kính chịu lực gấp 4-5 lần kính thường, an toàn tuyệt đối khi vỡ (tạo hạt ngô). Phù hợp làm cửa, vách ngăn văn phòng.',
    imageUrl: 'https://picsum.photos/600/400?random=1',
    features: ['Chịu lực cao', 'Chịu nhiệt tốt', 'An toàn']
  },
  {
    id: 'p2',
    name: 'Kính Dán An Toàn 2 Lớp',
    category: GlassCategory.LAMINATED,
    priceRange: 'Liên hệ',
    description: 'Kính ghép nhiều lớp với phim PVB ở giữa. Khi vỡ kính không rơi ra mà dính vào phim, chống trộm và cực kỳ an toàn.',
    imageUrl: 'https://picsum.photos/600/400?random=2',
    features: ['Chống trộm', 'Cách âm', 'Không rơi mảnh']
  },
  {
    id: 'p3',
    name: 'Kính Hộp Low-E Cách Nhiệt',
    category: GlassCategory.INSULATED,
    priceRange: 'Liên hệ',
    description: 'Cấu tạo 2 lớp kính với khí trơ ở giữa. Giảm tiếng ồn tối đa và tiết kiệm điện năng điều hòa nhờ khả năng cách nhiệt.',
    imageUrl: 'https://picsum.photos/600/400?random=3',
    features: ['Siêu cách âm', 'Tiết kiệm điện', 'Chống đọng sương']
  },
  {
    id: 'p4',
    name: 'Kính Ốp Bếp Sơn Màu',
    category: GlassCategory.DECORATIVE,
    priceRange: '900.000đ - 1.200.000đ / md',
    description: 'Kính cường lực sơn chịu nhiệt, bề mặt láng mịn dễ lau chùi dầu mỡ. Đa dạng màu sắc hợp phong thủy.',
    imageUrl: 'https://picsum.photos/600/400?random=4',
    features: ['Dễ vệ sinh', 'Màu sắc đa dạng', 'Chịu nhiệt']
  },
  {
    id: 'p5',
    name: 'Phòng Tắm Kính 135 Độ',
    category: GlassCategory.SHOWER,
    priceRange: '2.500.000đ - 4.000.000đ / bộ',
    description: 'Cabin tắm kính vát góc hiện đại, phụ kiện inox 304 chống rỉ. Giữ phòng tắm luôn khô ráo sạch sẽ.',
    imageUrl: 'https://picsum.photos/600/400?random=5',
    features: ['Sang trọng', 'Kín nước', 'Phụ kiện cao cấp']
  },
  {
    id: 'p6',
    name: 'Gương Bỉ Tráng Bạc 8 Lớp',
    category: GlassCategory.MIRROR,
    priceRange: 'Liên hệ',
    description: 'Gương nhập khẩu cao cấp, hình ảnh chân thực, không ố mốc theo thời gian. Cắt theo kích thước yêu cầu.',
    imageUrl: 'https://picsum.photos/600/400?random=6',
    features: ['Soi nét', 'Chống ố mốc', 'Bền bỉ']
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Anh Minh",
    role: "Kiến trúc sư",
    content: "Hoàng Phúc Glass luôn là đối tác tin cậy cho các dự án biệt thự của tôi. Kính chất lượng, thi công đúng tiến độ.",
    avatar: "https://picsum.photos/100/100?random=10"
  },
  {
    id: 2,
    name: "Chị Lan",
    role: "Chủ Spa Quận 3",
    content: "Hệ thống gương và vách kính tại Spa được Hoàng Phúc lắp đặt rất đẹp, tạo không gian sang trọng. Rất hài lòng!",
    avatar: "https://picsum.photos/100/100?random=11"
  },
  {
    id: 3,
    name: "Công Ty XD Hưng Thịnh",
    role: "Đối tác",
    content: "Giá cả cạnh tranh, đội ngũ kỹ thuật viên tay nghề cao. Sẽ hợp tác lâu dài.",
    avatar: "https://picsum.photos/100/100?random=12"
  }
];