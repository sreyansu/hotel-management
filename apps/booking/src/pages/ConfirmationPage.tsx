import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../lib/api';
import { CheckCircle, Calendar, MapPin, Users, Download, Home } from 'lucide-react';
import { format } from 'date-fns';

export default function ConfirmationPage() {
    const { bookingId } = useParams<{ bookingId: string }>();

    const { data, isLoading } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: () => bookingsApi.getById(bookingId!),
        enabled: !!bookingId,
    });

    const booking = data?.data;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
                <Link to="/" className="btn-primary">Go to Home</Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* Success Banner */}
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                <p className="text-gray-600">Your reservation has been successfully processed</p>
            </div>

            {/* Booking Details Card */}
            <div className="card p-6 mb-6">
                <div className="flex justify-between items-start mb-6 pb-6 border-b">
                    <div>
                        <div className="text-sm text-gray-500 mb-1">Booking Reference</div>
                        <div className="font-mono text-2xl font-bold text-primary-600">{booking.booking_reference}</div>
                    </div>
                    <span className="badge-success text-sm">{booking.status}</span>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                            <div className="font-medium text-gray-900">{booking.hotel?.name}</div>
                            <div className="text-sm text-gray-500">{booking.room_type?.name}</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                            <div className="font-medium text-gray-900">
                                {format(new Date(booking.check_in_date), 'EEE, MMM d, yyyy')}
                                {' → '}
                                {format(new Date(booking.check_out_date), 'EEE, MMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                                Check-in: {booking.hotel?.check_in_time} | Check-out: {booking.hotel?.check_out_time}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                            <div className="font-medium text-gray-900">{booking.guest_name}</div>
                            <div className="text-sm text-gray-500">{booking.num_guests} Guest(s)</div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between text-lg">
                        <span className="font-medium">Total Paid</span>
                        <span className="font-bold text-primary-600">₹{Number(booking.total_amount).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Important Info */}
            <div className="bg-blue-50 rounded-xl p-4 mb-8">
                <h3 className="font-medium text-blue-900 mb-2">Important Information</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Please carry a valid government ID for check-in</li>
                    <li>• Check-in time is {booking.hotel?.check_in_time}</li>
                    <li>• A confirmation email has been sent to {booking.guest_email}</li>
                </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/my-bookings" className="btn-primary flex-1 justify-center py-3">
                    <Calendar className="w-5 h-5" />
                    View My Bookings
                </Link>
                <Link to="/" className="btn-outline flex-1 justify-center py-3">
                    <Home className="w-5 h-5" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
