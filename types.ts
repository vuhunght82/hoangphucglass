// Fix: Added missing type definitions for Product, Testimonial, GlassCategory and ChatMessage.
export enum GlassCategory {
  TEMPERED = 'Kính Cường Lực',
  LAMINATED = 'Kính Dán An Toàn',
  INSULATED = 'Kính Hộp',
  DECORATIVE = 'Kính Trang Trí',
  SHOWER = 'Phòng Tắm Kính',
  MIRROR = 'Gương Kính',
}

export interface Product {
  id: string;
  name: string;
  category: GlassCategory;
  priceRange: string;
  description: string;
  imageUrl: string;
  features: string[];
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  avatar: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}


export type UserRole = 'admin' | 'sales' | 'production' | 'delivery';

export interface Customer {
  id: string;
  firebaseKey?: string; // Real Database Key
  code: string; // Mã KH (ma)
  name: string; // Tên (ten)
  address: string; // Địa chỉ (diachi)
  phone: string; // SĐT (sdt)
  email?: string;
  type: 'daily' | 'cong_ty' | 'khach_le'; // Đại lý, Công ty, Khách lẻ
  paymentMode?: 'tien_mat' | 'cong_no'; // Hình thức (hinhthuc)
  currentDebt: number; // Công nợ (congno)
  debtLimit?: number;
  tradeGroup?: string; // Nhóm nghề
}

export interface Agency {
  id: string;
  firebaseKey?: string;
  code: string; // Mã DL
  name: string; // Tên
  address: string; // Địa chỉ
  phone: string; // SĐT
  email?: string;
  currentDebt: number; // Công nợ
}


export interface Employee {
  id: string; // Internal ID (usually same as username)
  firebaseKey?: string; // Real Database Key
  username: string; // username
  fullName: string; // hoten
  address: string; // diachi
  phone: string; // sdt
  birthDate: string; // ngaysinh (YYYY-MM-DD)
  password: string; // password
}

export interface GrindingType {
  id: string;
  code: string; // 4c, 2d, 2n, 1d, 1n
  name: string;
  pricePerMeter: number;
}

// Updated for full CRUD management
export interface ProductItem {
  id: string;
  firebaseKey?: string;
  code: string; // ma
  name: string; // ten
  unit: string; // m2, md, cai
}

export interface ProcessingUnit {
  id: string;
  firebaseKey?: string;
  code: string; // ma
  name: string; // ten
  phone: string; // sdt
  address: string; // diachi
  email: string;
  tradeGroup?: string; // Nhóm nghề
}

// Price Rule for Bảng giá niêm yết
export interface PriceRule {
  id: string; // productCode serves as ID
  productCode: string;
  productName: string; // For display convenience
  glassPrice: number;
  temperedGlassPrice?: number; // Giá C.Lực
  grindingPrice: number;
  drillPrice: number;
  cutoutPrice: number;
}

export interface InvoiceItem {
  id: string;
  productCode?: string; // Mã hàng hóa
  description: string; // Tên loại kính
  width: number; // mm (hs2)
  height: number; // mm (hs1)
  quantity: number; // Số tấm
  area: number; // m2
  
  // Mài
  grindingType: string; // Code: 4c, 2d...
  grindingLength: number; // Mét dài (metMai)
  grindingUnitPrice: number; // Đơn giá mài (donGiaMai)
  grindingPrice: number; // Thành tiền mài (tienMai - Calculated)
  
  // Khoan
  drillHoles: number; // Số lỗ
  drillUnitPrice: number; // Đơn giá khoan (donGiaKhoan)
  drillPrice: number; // Thành tiền khoan (tienKhoan - Calculated)
  
  // Khoét
  cutouts: number; // Số đường khoét
  cutoutUnitPrice: number; // Đơn giá khoét (donGiaKhoet)
  cutoutPrice: number; // Thành tiền khoét (tienKhoet - Calculated)

  unitPrice: number; // Giá kính / m2 (donGia)
  total: number; // Thành tiền tổng
}

export interface Invoice {
  id: string; // HDngaythangnam+count
  firebaseKey?: string; // Real Database Key
  customerId: string;
  customerName: string; // Cache for display
  customerAddress: string;
  customerPhone: string;
  
  date: string; // ISO date string or YYYY-MM-DD
  deliveryDate?: string; // Ngay Giao
  
  items: InvoiceItem[];
  
  // Financials
  subTotal: number;
  transportFee: number; // Tiền xe
  discount: number; // Chiết khấu
  deposit: number; // Trả trước (tienCoc)
  totalAmount: number; // (tongTien)
  remainingAmount: number; // (conLai)
  
  paymentType: 'tien_mat' | 'cong_no';
  status: 'chua_giao' | 'da_cat' | 'da_giao';
  paymentStatus?: 'chua_thanh_toan' | 'da_chuyen_khoan' | 'da_tra_tien_mat' | 'thanh_toan_mot_phan';

  note?: string; // Ghi chú (ghiChu)
  qrCodeContent?: string;

  // Personnel
  createdBy: string;
  deliveryBy?: string;
}

export interface GoodsReceiptItem {
  id: string;
  description: string;
  hs1: number;
  hs2: number;
  unit: string; // 'tấm', 'kiện', 'm2'
  packs: number; // số kiện
  sheetsPerPack: number; // tấm/kiện
  quantity: number; // tổng số tấm
  unitPrice: number;
  total: number;
}

export interface GoodsReceiptNote {
  id: string; // PN...
  firebaseKey?: string;
  agencyId: string;
  agencyName: string;
  date: string; // YYYY-MM-DD
  items: GoodsReceiptItem[];
  totalAmount: number;
  paymentType: 'tien_mat' | 'cong_no';
  note?: string;
  createdBy: string;
  deliveredBy?: string;
  receivedBy?: string;
}

export interface Payment {
  id: string;
  firebaseKey?: string;
  customerId: string;
  customerName: string;
  date: string; // ISO YYYY-MM-DD
  amount: number;
  method: 'tien_mat' | 'chuyen_khoan' | 'dieu_chinh';
  note?: string;
  type: 'payment' | 'debt_adjustment';
}

export interface CompanyConfig {
  name: string;
  address: string;
  phone: string;
  email?: string;
  bankInfo?: string;
  taxCode?: string; // Mã số thuế (maSoThue)
  logoUrl?: string;
  qrCodeUrl?: string;
}

export interface LabelElement {
  id: string;
  type: 'text' | 'line';
  
  // Common properties
  x: number;
  y: number;
  rotation: number;
  isDeletable?: boolean;

  // Text properties
  contentKey?: string; // e.g., 'customerName', 'dimensions', 'itemIndex', 'custom'
  customText?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';

  // Line properties
  width?: number; // width in mm
  height?: number; // This will be thickness for lines in mm
  backgroundColor?: string;
}

export interface LabelDesign {
  width: number; // in mm
  height: number; // in mm
  borderRadius: number; // in mm
  elements: LabelElement[];
}

export interface AppSettings {
  itemsPerPage: number;
  companyNameSize?: number;
  invoiceTitleSize?: number;
  labelWidth?: number;
  labelHeight?: number;
  defaultLabelPrinter?: string;
  productAttributes?: string[];
  companyInfo?: CompanyConfig;
  customerTradeGroups?: string[];
  processingUnitTradeGroups?: string[];
  labelDesign?: LabelDesign;
}

export interface ProcessingTicketItem {
  id: string; // From invoice item or new
  description: string;
  width: number;
  height: number;
  quantity: number;
  area: number;
  processingType: string; // Cường lực, Mài, etc.
  grindingType?: string;
  notes?: string;
  sourceInvoiceId?: string; // Track where it came from
  customerName?: string;
  unitPrice?: number;
  total?: number;
}

export interface ProcessingTicket {
  id: string; // GC_...
  firebaseKey?: string;
  processingUnitId: string;
  processingUnitName: string;
  date: string; // YYYY-MM-DD
  items: ProcessingTicketItem[];
  totalArea: number;
  totalQuantity: number;
  totalAmount?: number;
  note?: string;
  status: 'new' | 'in_progress' | 'completed';
}

export interface DebtSummaryTransaction {
    date: string;
    type: 'invoice' | 'payment' | 'adjustment';
    description: string; // Invoice ID or Payment Note
    amount: number; // Always positive
    balanceChange: number; // Positive for invoice, negative for payment
}

export interface DebtSummary {
    id: string; // YYYY-MM
    firebaseKey?: string;
    customerId: string;
    customerName: string;
    startDate: string;
    endDate: string;
    openingBalance: number;
    closingBalance: number;
    totalNewDebt: number;
    totalPayments: number;
    transactions: DebtSummaryTransaction[];
    generatedAt: string;
}

export interface InvoiceFormInstance {
  id: string; // Temp ID for new, or invoice.id for existing
  invoice: Invoice | null; // The invoice data, null if new
}