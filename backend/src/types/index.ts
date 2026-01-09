// =====================================================
// USER & AUTH TYPES
// =====================================================

export type UserRole =
    | 'SUPER_ADMIN'
    | 'HOTEL_ADMIN'
    | 'DUTY_MANAGER'
    | 'RECEPTION'
    | 'HOUSEKEEPING'
    | 'ACCOUNTS'
    | 'CUSTOMER';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    SUPER_ADMIN: 0,
    HOTEL_ADMIN: 1,
    DUTY_MANAGER: 2,
    RECEPTION: 3,
    HOUSEKEEPING: 4,
    ACCOUNTS: 5,
    CUSTOMER: 6,
};

export interface User {
    id: string;
    firebase_uid: string;
    email: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface UserWithRoles extends User {
    roles: UserRoleAssignment[];
}

export interface UserRoleAssignment {
    id: string;
    user_id: string;
    role: UserRole;
    hotel_id?: string;
    created_at: string;
}

// =====================================================
// HOTEL TYPES
// =====================================================

export interface Hotel {
    id: string;
    name: string;
    slug: string;
    description?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    star_rating?: number;
    check_in_time: string;
    check_out_time: string;
    cover_image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface HotelWithDetails extends Hotel {
    images: HotelImage[];
    amenities: Amenity[];
    room_types: RoomType[];
}

export interface HotelImage {
    id: string;
    hotel_id: string;
    image_url: string;
    caption?: string;
    display_order: number;
}

export interface Amenity {
    id: string;
    name: string;
    icon?: string;
    category?: string;
}

// =====================================================
// ROOM TYPES
// =====================================================

export interface RoomType {
    id: string;
    hotel_id: string;
    name: string;
    description?: string;
    base_price: number;
    max_occupancy: number;
    bed_type?: string;
    room_size_sqft?: number;
    image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoomTypeWithAmenities extends RoomType {
    amenities: Amenity[];
    available_count?: number;
}

export type RoomStatus =
    | 'AVAILABLE'
    | 'OCCUPIED'
    | 'CLEANING'
    | 'MAINTENANCE'
    | 'OUT_OF_ORDER';

export interface Room {
    id: string;
    hotel_id: string;
    room_type_id: string;
    room_number: string;
    floor?: number;
    status: RoomStatus;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoomWithType extends Room {
    room_type: RoomType;
}

// =====================================================
// BOOKING TYPES
// =====================================================

export type BookingStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'CHECKED_IN'
    | 'CHECKED_OUT'
    | 'CANCELLED'
    | 'NO_SHOW';

export interface Booking {
    id: string;
    booking_reference: string;
    hotel_id: string;
    user_id: string;
    room_id?: string;
    room_type_id: string;
    check_in_date: string;
    check_out_date: string;
    num_guests: number;
    status: BookingStatus;

    // Pricing snapshot
    base_price: number;
    seasonal_multiplier: number;
    day_type_multiplier: number;
    occupancy_multiplier: number;
    subtotal: number;
    coupon_id?: string;
    coupon_discount: number;
    taxes: number;
    total_amount: number;

    // Guest details
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests?: string;

    // Check-in/out tracking
    actual_check_in?: string;
    actual_check_out?: string;
    checked_in_by?: string;
    checked_out_by?: string;

    created_at: string;
    updated_at: string;
    cancelled_at?: string;
    cancellation_reason?: string;
}

export interface BookingWithDetails extends Booking {
    hotel: Hotel;
    room_type: RoomType;
    room?: Room;
    payment_sessions: PaymentSession[];
}

export interface BookingGuest {
    id: string;
    booking_id: string;
    full_name: string;
    age?: number;
    id_type?: string;
    id_number?: string;
}

// =====================================================
// PRICING TYPES
// =====================================================

export interface SeasonalPricing {
    id: string;
    hotel_id: string;
    name: string;
    start_date: string;
    end_date: string;
    multiplier: number;
    is_active: boolean;
}

export type DayType = 'WEEKDAY' | 'WEEKEND';

export interface DayTypePricing {
    id: string;
    hotel_id: string;
    day_type: DayType;
    multiplier: number;
}

export interface OccupancyPricing {
    id: string;
    hotel_id: string;
    min_occupancy_pct: number;
    max_occupancy_pct: number;
    multiplier: number;
}

export interface PricingConfig {
    seasonal_pricing: SeasonalPricing[];
    day_type_pricing: DayTypePricing[];
    occupancy_pricing: OccupancyPricing[];
}

export interface PriceCalculation {
    base_price: number;
    nights: number;
    seasonal_multiplier: number;
    day_type_multiplier: number;
    occupancy_multiplier: number;
    subtotal: number;
    coupon_discount: number;
    taxes: number;
    total_amount: number;
    breakdown: PriceBreakdownItem[];
}

export interface PriceBreakdownItem {
    date: string;
    base_price: number;
    seasonal_multiplier: number;
    day_type_multiplier: number;
    occupancy_multiplier: number;
    daily_total: number;
}

// =====================================================
// COUPON TYPES
// =====================================================

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
    id: string;
    hotel_id?: string;
    code: string;
    description?: string;
    discount_type: DiscountType;
    discount_value: number;
    max_discount?: number;
    min_booking_amount: number;
    usage_limit?: number;
    used_count: number;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    created_by?: string;
    created_at: string;
}

export interface CouponValidationResult {
    valid: boolean;
    coupon?: Coupon;
    discount_amount?: number;
    error?: string;
}

// =====================================================
// PAYMENT TYPES
// =====================================================

export type PaymentSessionStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED';

export interface PaymentSession {
    id: string;
    booking_id: string;
    session_token: string;
    amount: number;
    upi_id?: string;
    qr_code_data?: string;
    status: PaymentSessionStatus;
    expires_at: string;
    created_at: string;
}

export interface Payment {
    id: string;
    booking_id: string;
    payment_session_id?: string;
    amount: number;
    payment_method: string;
    transaction_id?: string;
    status: PaymentStatus;
    verified_by?: string;
    verified_at?: string;
    created_at: string;
}

// =====================================================
// HOUSEKEEPING TYPES
// =====================================================

export interface HousekeepingLog {
    id: string;
    room_id: string;
    hotel_id: string;
    staff_id: string;
    action: string;
    previous_status?: RoomStatus;
    new_status?: RoomStatus;
    notes?: string;
    created_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

export interface AvailabilityQuery {
    hotel_id: string;
    check_in_date: string;
    check_out_date: string;
    guests?: number;
}

export interface CreateBookingRequest {
    hotel_id: string;
    room_type_id: string;
    check_in_date: string;
    check_out_date: string;
    num_guests: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests?: string;
    coupon_code?: string;
    additional_guests?: Omit<BookingGuest, 'id' | 'booking_id'>[];
}

export interface CalculatePriceRequest {
    hotel_id: string;
    room_type_id: string;
    check_in_date: string;
    check_out_date: string;
    coupon_code?: string;
}

export interface CreatePaymentSessionRequest {
    booking_id: string;
}

export interface VerifyPaymentRequest {
    transaction_id: string;
    payment_method: string;
}
