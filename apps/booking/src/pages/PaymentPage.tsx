import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../lib/api';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function PaymentPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState<number>(0);

    // Create payment session
    const { data: sessionData, isLoading } = useQuery({
        queryKey: ['paymentSession', bookingId],
        queryFn: async () => {
            const response = await bookingsApi.createPaymentSession(bookingId!);
            return response.data;
        },
        enabled: !!bookingId,
        refetchInterval: 5000, // Check status every 5 seconds
    });

    const session = sessionData;

    // Timer countdown
    useEffect(() => {
        if (session?.remaining_seconds) {
            setTimeLeft(session.remaining_seconds);
        }
    }, [session?.remaining_seconds]);

    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // Check if payment was successful
    useEffect(() => {
        if (session?.status === 'PAID') {
            navigate(`/confirmation/${bookingId}`);
        }
    }, [session?.status, bookingId, navigate]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
                <p className="text-gray-600 mb-6">The payment session could not be loaded.</p>
                <button onClick={() => navigate('/')} className="btn-primary">
                    Go to Home
                </button>
            </div>
        );
    }

    if (session.status === 'EXPIRED' || timeLeft === 0) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h1>
                <p className="text-gray-600 mb-6">
                    The payment session has expired. Please create a new booking to continue.
                </p>
                <button onClick={() => navigate('/')} className="btn-primary">
                    Book Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
                <p className="text-gray-600">Scan the QR code to pay via UPI</p>
            </div>

            <div className="card p-8">
                {/* Timer */}
                <div className={`flex items-center justify-center gap-2 mb-6 ${timeLeft <= 60 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                    <Clock className="w-5 h-5" />
                    <span className="font-mono text-lg">
                        Session expires in: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                    <div
                        className={`h-2 rounded-full transition-all duration-1000 ${timeLeft <= 60 ? 'bg-red-500' : 'bg-primary-500'
                            }`}
                        style={{ width: `${(timeLeft / 300) * 100}%` }}
                    ></div>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-6">
                    {session.qr_code_data ? (
                        <img
                            src={session.qr_code_data}
                            alt="Payment QR Code"
                            className="w-64 h-64 mx-auto"
                        />
                    ) : (
                        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center mx-auto">
                            <span className="text-gray-500">QR Code</span>
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div className="text-center mb-6">
                    <div className="text-sm text-gray-500 mb-1">Amount to pay</div>
                    <div className="font-display text-3xl font-bold text-primary-600">
                        ₹{session.amount?.toLocaleString()}
                    </div>
                </div>

                {/* UPI ID */}
                {session.upi_id && (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-500 mb-1">Or pay directly to</div>
                        <div className="font-mono text-lg font-medium">{session.upi_id}</div>
                    </div>
                )}

                {/* Status indicator */}
                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-500">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span>Waiting for payment...</span>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 text-sm text-gray-500 space-y-2">
                    <p className="font-medium">How to pay:</p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                        <li>Scan the QR code above</li>
                        <li>Verify the amount and confirm payment</li>
                        <li>Wait for confirmation on this page</li>
                    </ol>
                </div>
            </div>

            {/* Note */}
            <p className="text-center text-sm text-gray-500 mt-6">
                Do not close this page until payment is confirmed.
                <br />
                The page will automatically update once payment is received.
            </p>
        </div>
    );
}
