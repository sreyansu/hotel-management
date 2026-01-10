import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getHotels } from '../lib/queries';
import { MapPin, Star, Wifi, Car, Coffee, Dumbbell, Search } from 'lucide-react';
import { useState } from 'react';

interface Hotel {
    id: string;
    name: string;
    slug: string;
    description: string;
    city: string;
    state: string;
    star_rating: number;
    cover_image_url: string;
}

export default function HomePage() {
    const [searchCity, setSearchCity] = useState('');

    const { data: hotels = [], isLoading } = useQuery({
        queryKey: ['hotels'],
        queryFn: getHotels,
    });

    // Filter hotels by search city (client-side for now)
    const filteredHotels = searchCity
        ? hotels.filter((h: Hotel) => h.city.toLowerCase().includes(searchCity.toLowerCase()))
        : hotels;

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-24 lg:py-32">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920')] bg-cover bg-center opacity-20"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Experience Luxury at{' '}
                            <span className="text-gradient">Grand Palace</span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-300 mb-8">
                            Discover exceptional stays across India's most beautiful destinations.
                            From Mumbai's skyline to Goa's beaches, find your perfect getaway.
                        </p>

                        {/* Search Box */}
                        <div className="bg-white rounded-2xl p-2 shadow-2xl max-w-2xl">
                            <div className="flex flex-col md:flex-row gap-2">
                                <div className="flex-1 relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Where are you going?"
                                        className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        value={searchCity}
                                        onChange={(e) => setSearchCity(e.target.value)}
                                    />
                                </div>
                                <button className="btn-primary px-8 py-4 rounded-xl">
                                    <Search className="w-5 h-5 md:hidden" />
                                    <span className="hidden md:inline">Search Hotels</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-12 bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: Wifi, label: 'Free WiFi' },
                            { icon: Car, label: 'Free Parking' },
                            { icon: Coffee, label: 'Breakfast Included' },
                            { icon: Dumbbell, label: 'Fitness Center' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-3 text-gray-600">
                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-primary-600" />
                                </div>
                                <span className="font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hotels Grid */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="font-display text-3xl font-bold text-gray-900">Our Hotels</h2>
                            <p className="text-gray-600 mt-1">Handpicked luxury stays across India</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card animate-pulse">
                                    <div className="h-48 bg-gray-200"></div>
                                    <div className="p-6 space-y-3">
                                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredHotels.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-500 text-lg">No hotels found. Try a different search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredHotels.map((hotel: Hotel) => (
                                <Link
                                    key={hotel.id}
                                    to={`/hotels/${hotel.slug}`}
                                    className="card-hover group"
                                >
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={hotel.cover_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'}
                                            alt={hotel.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="font-semibold text-sm">{hotel.star_rating}</span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-display text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition">
                                            {hotel.name}
                                        </h3>
                                        <div className="flex items-center gap-1 text-gray-500 mb-3">
                                            <MapPin className="w-4 h-4" />
                                            <span>{hotel.city}, {hotel.state}</span>
                                        </div>
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {hotel.description}
                                        </p>
                                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                            <span className="text-gray-500 text-sm">Starting from</span>
                                            <span className="font-bold text-lg text-primary-600">₹7,000<span className="text-sm font-normal text-gray-500">/night</span></span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-primary-600 to-secondary-600 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Book Your Stay?
                    </h2>
                    <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                        Join thousands of satisfied guests who have experienced the Grand Palace difference.
                    </p>
                    <Link to="/" className="inline-block bg-white text-primary-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg">
                        Explore Hotels
                    </Link>
                </div>
            </section>
        </div>
    );
}
