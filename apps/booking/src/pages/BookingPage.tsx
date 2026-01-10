import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useBookingStore, useAuthStore, useIsAuthenticated } from '../store';
import { createBooking, validateCoupon, getHotelRoomTypes } from '../lib/queries';
import { format, differenceInDays } from 'date-fns';
import { Calendar, Users, Building2, Tag, Check, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function BookingPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAuthenticated = useIsAuthenticated();
    const booking = useBookingStore();
    const { setBooking } = useBookingStore();

    const [guestName, setGuestName] = useState(user?.full_name || '');
    const [guestEmail, setGuestEmail] = useState(user?.email || '');
    const [guestPhone, setGuestPhone] = useState('');
    const [specialRequests, setSpecialRequests] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?redirect=/booking');
            return;
        }
        if (!booking.hotelId || !booking.roomTypeId) {
            navigate('/');
        }
    }, [isAuthenticated, booking.hotelId, booking.roomTypeId, navigate]);

    const nights = booking.checkInDate && booking.checkOutDate
        ? differenceInDays(new Date(booking.checkOutDate), new Date(booking.checkInDate))
        : 0;

    // Get room type for pricing
    const { data: roomTypes = [] } = useQuery({
        queryKey: ['roomTypes', booking.hotelId],
        queryFn: () => getHotelRoomTypes(booking.hotelId!),
        enabled: !!booking.hotelId,
    });

    const selectedRoom = roomTypes.find((rt: any) => rt.id === booking.roomTypeId);
    const basePrice = selectedRoom ? Number(selectedRoom.base_price) : 0;
    const subtotal = basePrice * nights;
    const taxes = Math.round(subtotal * 0.18); // 18% GST
    const totalAmount = subtotal + taxes - (appliedCoupon?.discount || 0);

    // Apply coupon
    const applyCouponMutation = useMutation({
        mutationFn: () => validateCoupon(couponCode, booking.hotelId!),
        onSuccess: (coupon) => {
            let discount = 0;
            if (coupon.discount_type === 'PERCENTAGE') {
                discount = Math.min(
                    (subtotal * Number(coupon.discount_value)) / 100,
                    coupon.max_discount ? Number(coupon.max_discount) : subtotal
                );
            } else {
                discount = Number(coupon.discount_value);
            }
            setAppliedCoupon({ code: coupon.code, discount });
            setCouponError('');
        },
        onError: (error: any) => {
            setCouponError(error.message || 'Invalid coupon');
        },
    });

    // Create booking
    const createBookingMutation = useMutation({
        mutationFn: () => createBooking({
            hotel_id: booking.hotelId!,
            room_type_id: booking.roomTypeId!,
            check_in_date: booking.checkInDate!,
            check_out_date: booking.checkOutDate!,
            num_guests: booking.numGuests,
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone,
            special_requests: specialRequests || undefined,
            coupon_code: appliedCoupon?.code,
        }),
        onSuccess: (data) => {
            navigate(`/payment/${data.id}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName || !guestEmail || !guestPhone) return;
        createBookingMutation.mutate();
    };

    if (!booking.hotelId) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-8">Complete Your Booking</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Booking Summary */}
                    <div className="card p-6">
                        <h2 className="font-display text-xl font-bold text-gray-900 mb-4">Booking Details</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="font-medium">{booking.hotelName}</div>
                                    <div className="text-sm text-gray-500">{booking.roomTypeName}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="font-medium">
                                        {booking.checkInDate && format(new Date(booking.checkInDate), 'EEE, MMM d, yyyy')}
                                        {' → '}
                                        {booking.checkOutDate && format(new Date(booking.checkOutDate), 'EEE, MMM d, yyyy')}
                                    </div>
                                    <div className="text-sm text-gray-500">{nights} night{nights > 1 ? 's' : ''}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-gray-400" />
                                <div className="font-medium">{booking.numGuests} Guest{booking.numGuests > 1 ? 's' : ''}</div>
                            </div>
                        </div>
                    </div>

                    {/* Guest Details Form */}
                    <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                        <h2 className="font-display text-xl font-bold text-gray-900">Guest Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Full Name *</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Email *</label>
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    className="input"
                                    placeholder="+91 98765 43210"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Special Requests (Optional)</label>
                            <textarea
                                value={specialRequests}
                                onChange={(e) => setSpecialRequests(e.target.value)}
                                className="input min-h-[100px]"
                                placeholder="Any special requests or preferences..."
                            />
                        </div>

                        {/* Coupon */}
                        <div>
                            <label className="label">
                                <Tag className="w-4 h-4 inline mr-1" />
                                Promo Code
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    className="input flex-1"
                                    placeholder="Enter code"
                                    disabled={!!appliedCoupon}
                                />
                                {appliedCoupon ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAppliedCoupon(null);
                                            setCouponCode('');
                                        }}
                                        className="btn-outline"
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => applyCouponMutation.mutate()}
                                        disabled={!couponCode || applyCouponMutation.isPending}
                                        className="btn-secondary"
                                    >
                                        Apply
                                    </button>
                                )}
                            </div>
                            {couponError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {couponError}
                                </p>
                            )}
                            {appliedCoupon && (
                                <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                    <Check className="w-4 h-4" />
                                    Coupon applied! You save ₹{appliedCoupon.discount.toLocaleString()}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={createBookingMutation.isPending || !guestName || !guestEmail || !guestPhone}
                            className="btn-primary w-full py-4 text-lg"
                        >
                            {createBookingMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
                        </button>
                    </form>
                </div>

                {/* Price Summary */}
                <div className="lg:col-span-1">
                    <div className="card p-6 sticky top-24">
                        <h3 className="font-display text-xl font-bold text-gray-900 mb-6">Price Summary</h3>

                        {basePrice > 0 ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>₹{basePrice.toLocaleString()} × {nights} nights</span>
                                    <span>₹{subtotal.toLocaleString()}</span>
                                </div>

                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Coupon ({appliedCoupon.code})</span>
                                        <span>-₹{appliedCoupon.discount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-sm">
                                    <span>Taxes & fees (GST 18%)</span>
                                    <span>₹{taxes.toLocaleString()}</span>
                                </div>

                                <div className="pt-4 border-t">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span className="text-primary-600">₹{totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded"></div>
                                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                <div className="h-6 bg-gray-200 rounded mt-4"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
