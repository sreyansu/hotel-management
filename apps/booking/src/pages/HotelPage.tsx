import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { hotelsApi } from '../lib/api';
import { useBookingStore, useIsAuthenticated } from '../store';
import { MapPin, Star, Clock, Wifi, Car, Coffee, Users, Check, Calendar } from 'lucide-react';
import { useState } from 'react';
import { format, addDays } from 'date-fns';

export default function HotelPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const isAuthenticated = useIsAuthenticated();
    const { setBooking } = useBookingStore();

    const [checkIn, setCheckIn] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
    const [guests, setGuests] = useState(2);
    const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);

    const { data: hotel, isLoading } = useQuery({
        queryKey: ['hotel', slug],
        queryFn: () => hotelsApi.getBySlug(slug!),
        enabled: !!slug,
    });

    const { data: roomTypesData } = useQuery({
        queryKey: ['roomTypes', hotel?.data?.id, checkIn, checkOut],
        queryFn: () => hotelsApi.getRoomTypes(hotel?.data?.id, checkIn, checkOut),
        enabled: !!hotel?.data?.id && !!checkIn && !!checkOut,
    });

    const hotelData = hotel?.data;
    const roomTypes = roomTypesData?.data || [];

    const handleBookNow = () => {
        if (!selectedRoomType || !hotelData) return;

        const selectedRoom = roomTypes.find((rt: any) => rt.id === selectedRoomType);

        setBooking({
            hotelId: hotelData.id,
            hotelName: hotelData.name,
            roomTypeId: selectedRoomType,
            roomTypeName: selectedRoom?.name,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numGuests: guests,
        });

        if (!isAuthenticated) {
            navigate('/login?redirect=/booking');
        } else {
            navigate('/booking');
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-96 bg-gray-200 rounded-2xl"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
            </div>
        );
    }

    if (!hotelData) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Hotel Not Found</h1>
                <Link to="/" className="btn-primary">Browse Hotels</Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Hero Image */}
            <div className="relative h-[400px] lg:h-[500px]">
                <img
                    src={hotelData.cover_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920'}
                    alt={hotelData.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                            {[...Array(hotelData.star_rating || 5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            ))}
                        </div>
                        <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-2">
                            {hotelData.name}
                        </h1>
                        <div className="flex items-center gap-1 text-white/80">
                            <MapPin className="w-5 h-5" />
                            <span>{hotelData.address}, {hotelData.city}, {hotelData.state}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        <section className="card p-6">
                            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">About This Property</h2>
                            <p className="text-gray-600 leading-relaxed">{hotelData.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-5 h-5 text-primary-600" />
                                    <div className="text-sm">
                                        <div className="font-medium">Check-in</div>
                                        <div>{hotelData.check_in_time}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-5 h-5 text-primary-600" />
                                    <div className="text-sm">
                                        <div className="font-medium">Check-out</div>
                                        <div>{hotelData.check_out_time}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Amenities */}
                        {hotelData.amenities?.length > 0 && (
                            <section className="card p-6">
                                <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {hotelData.amenities.map((amenity: any) => (
                                        <div key={amenity.id} className="flex items-center gap-3 text-gray-600">
                                            <Check className="w-5 h-5 text-green-500" />
                                            <span>{amenity.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Room Types */}
                        <section>
                            <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">Choose Your Room</h2>
                            <div className="space-y-4">
                                {roomTypes.map((roomType: any) => (
                                    <div
                                        key={roomType.id}
                                        className={`card p-4 cursor-pointer transition-all ${selectedRoomType === roomType.id
                                            ? 'ring-2 ring-primary-500 bg-primary-50'
                                            : 'hover:shadow-lg'
                                            }`}
                                        onClick={() => setSelectedRoomType(roomType.id)}
                                    >
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <img
                                                src={roomType.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'}
                                                alt={roomType.name}
                                                className="w-full md:w-48 h-32 object-cover rounded-lg"
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-display text-lg font-bold text-gray-900">{roomType.name}</h3>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Users className="w-4 h-4" />
                                                                Up to {roomType.max_occupancy} guests
                                                            </span>
                                                            {roomType.room_size_sqft && (
                                                                <span>{roomType.room_size_sqft} sq ft</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-xl text-primary-600">
                                                            ₹{Number(roomType.base_price).toLocaleString()}
                                                        </div>
                                                        <div className="text-sm text-gray-500">per night</div>
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 text-sm mt-2 line-clamp-2">{roomType.description}</p>
                                                {roomType.available_count !== undefined && (
                                                    <div className={`mt-2 text-sm ${roomType.available_count > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {roomType.available_count > 0
                                                            ? `${roomType.available_count} rooms available`
                                                            : 'No rooms available for selected dates'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Booking Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="card p-6 sticky top-24">
                            <h3 className="font-display text-xl font-bold text-gray-900 mb-6">Book Your Stay</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="label">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Check-in
                                    </label>
                                    <input
                                        type="date"
                                        value={checkIn}
                                        onChange={(e) => setCheckIn(e.target.value)}
                                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="label">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Check-out
                                    </label>
                                    <input
                                        type="date"
                                        value={checkOut}
                                        onChange={(e) => setCheckOut(e.target.value)}
                                        min={checkIn}
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="label">
                                        <Users className="w-4 h-4 inline mr-1" />
                                        Guests
                                    </label>
                                    <select
                                        value={guests}
                                        onChange={(e) => setGuests(Number(e.target.value))}
                                        className="input"
                                    >
                                        {[1, 2, 3, 4].map((n) => (
                                            <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedRoomType && (
                                    <div className="pt-4 border-t">
                                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                                            <span>Selected Room</span>
                                            <span className="font-medium">
                                                {roomTypes.find((rt: any) => rt.id === selectedRoomType)?.name}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleBookNow}
                                    disabled={!selectedRoomType}
                                    className="btn-primary w-full py-4 text-lg"
                                >
                                    {isAuthenticated ? 'Continue to Booking' : 'Sign In to Book'}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    You won't be charged yet
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
