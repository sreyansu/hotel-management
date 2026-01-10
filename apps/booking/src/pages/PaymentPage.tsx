import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getBookingById, createRazorpayOrder, verifyRazorpayPayment } from '../lib/queries';
import { CreditCard, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function PaymentPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Get booking details
    const { data: booking, isLoading, isError } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: () => getBookingById(bookingId!),
        enabled: !!bookingId,
    });

    // Verify payment mutation
    const verifyMutation = useMutation({
        mutationFn: verifyRazorpayPayment,
        onSuccess: () => {
            navigate(`/confirmation/${bookingId}`);
        },
        onError: (err: any) => {
            setError(err.message || 'Payment verification failed');
        },
    });

    const handlePayment = async () => {
        if (!booking || !bookingId) return;

        setLoading(true);
        setError('');

        try {
            // Create Razorpay order
            const orderData = await createRazorpayOrder(bookingId);

            // Open Razorpay checkout
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Grand Palace Hotels',
                description: `Booking ${orderData.booking_reference}`,
                order_id: orderData.order_id,
                prefill: {
                    name: orderData.guest_name,
                    email: orderData.guest_email,
                    contact: orderData.guest_phone,
                },
                theme: {
                    color: '#7C3AED',
                },
                handler: async function (response: any) {
                    // Verify payment
                    verifyMutation.mutate({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        booking_id: bookingId,
                    });
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', function (response: any) {
                setError(response.error?.description || 'Payment failed');
                setLoading(false);
            });
            razorpay.open();
        } catch (err: any) {
            setError(err.message || 'Failed to start payment');
            setLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (isError || !booking) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
                <p className="text-gray-600 mb-6">We couldn't find this booking.</p>
                <button onClick={() => navigate('/')} className="btn-primary">
                    Go to Home
                </button>
            </div>
        );
    }

    if (booking.status === 'CONFIRMED') {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Paid!</h1>
                <p className="text-gray-600 mb-6">This booking has already been confirmed.</p>
                <button onClick={() => navigate(`/confirmation/${bookingId}`)} className="btn-primary">
                    View Confirmation
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
                <p className="text-gray-600">Pay securely with Razorpay</p>
            </div>

            <div className="card p-6 space-y-6">
                {/* Booking Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Booking Reference</div>
                    <div className="font-mono font-medium text-gray-900">{booking.booking_reference}</div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Hotel</span>
                        <span className="font-medium">{booking.hotels?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Room Type</span>
                        <span className="font-medium">{booking.room_types?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Check-in</span>
                        <span className="font-medium">{new Date(booking.check_in_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Check-out</span>
                        <span className="font-medium">{new Date(booking.check_out_date).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total Amount</span>
                        <span className="text-2xl font-bold text-primary-600">
                            ₹{Number(booking.total_amount).toLocaleString()}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={loading || verifyMutation.isPending}
                    className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
                >
                    {loading || verifyMutation.isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="w-5 h-5" />
                            Pay ₹{Number(booking.total_amount).toLocaleString()}
                        </>
                    )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                    Secured by Razorpay. We support UPI, Cards, Net Banking & Wallets.
                </p>
            </div>
        </div>
    );
}
