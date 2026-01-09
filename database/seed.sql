-- Hotel Management Platform - Seed Data
-- This file contains sample data for development and testing

-- =============================================
-- Amenities (global)
-- =============================================
INSERT INTO amenities (name, icon, category) VALUES
    ('Free WiFi', 'wifi', 'connectivity'),
    ('Air Conditioning', 'thermometer', 'room'),
    ('Swimming Pool', 'waves', 'recreation'),
    ('Gym', 'dumbbell', 'recreation'),
    ('Spa', 'heart', 'wellness'),
    ('Restaurant', 'utensils', 'dining'),
    ('Bar', 'wine', 'dining'),
    ('Room Service', 'bell', 'service'),
    ('Laundry', 'shirt', 'service'),
    ('Parking', 'car', 'facility'),
    ('Business Center', 'briefcase', 'business'),
    ('Conference Room', 'users', 'business'),
    ('Kids Play Area', 'baby', 'family'),
    ('Pet Friendly', 'paw-print', 'policy'),
    ('Airport Shuttle', 'plane', 'transport'),
    ('Concierge', 'bell-concierge', 'service'),
    ('Mini Bar', 'martini', 'room'),
    ('Safe', 'lock', 'room'),
    ('TV', 'tv', 'room'),
    ('Coffee Maker', 'coffee', 'room'),
    ('Balcony', 'door-open', 'room'),
    ('Ocean View', 'sunset', 'view'),
    ('Mountain View', 'mountain', 'view'),
    ('City View', 'building', 'view')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Hotels
-- =============================================
INSERT INTO hotels (name, slug, description, address, city, state, country, postal_code, phone, email, star_rating, check_in_time, check_out_time, cover_image_url) VALUES
(
    'Grand Palace Mumbai',
    'grand-palace-mumbai',
    'Experience luxury in the heart of Mumbai. Our flagship property offers stunning views of the Arabian Sea, world-class dining, and impeccable service. Located in the prestigious Worli area, we are minutes away from major business districts and entertainment hubs.',
    '123 Marine Drive, Worli',
    'Mumbai',
    'Maharashtra',
    'India',
    '400018',
    '+91-22-1234-5678',
    'mumbai@grandpalace.com',
    5,
    '14:00',
    '11:00',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'
),
(
    'Grand Palace Goa',
    'grand-palace-goa',
    'Your beachside paradise awaits. Nestled along the pristine shores of Calangute Beach, our Goa property combines tropical elegance with modern amenities. Perfect for both relaxation and adventure.',
    '456 Beach Road, Calangute',
    'Goa',
    'Goa',
    'India',
    '403516',
    '+91-832-123-4567',
    'goa@grandpalace.com',
    5,
    '15:00',
    '11:00',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200'
),
(
    'Grand Palace Bangalore',
    'grand-palace-bangalore',
    'Where technology meets tradition. Our Bangalore property is the perfect blend of modern corporate efficiency and warm Indian hospitality. Located in the heart of the IT corridor with easy access to business parks.',
    '789 MG Road, Indiranagar',
    'Bangalore',
    'Karnataka',
    'India',
    '560038',
    '+91-80-1234-5678',
    'bangalore@grandpalace.com',
    4,
    '14:00',
    '12:00',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200'
),
(
    'Grand Palace Jaipur',
    'grand-palace-jaipur',
    'Experience royal heritage in the Pink City. Our Jaipur property is a masterpiece of Rajasthani architecture, offering a glimpse into the majestic past while providing all modern comforts. Perfect for heritage tourism and destination weddings.',
    '321 Palace Road, Civil Lines',
    'Jaipur',
    'Rajasthan',
    'India',
    '302006',
    '+91-141-123-4567',
    'jaipur@grandpalace.com',
    5,
    '14:00',
    '11:00',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200'
),
(
    'Grand Palace Delhi',
    'grand-palace-delhi',
    'The capital''s premier luxury destination. Strategically located near Connaught Place, our Delhi property offers unparalleled access to government offices, embassies, and cultural landmarks. Ideal for diplomats, executives, and discerning travelers.',
    '555 Janpath, Connaught Place',
    'New Delhi',
    'Delhi',
    'India',
    '110001',
    '+91-11-1234-5678',
    'delhi@grandpalace.com',
    5,
    '14:00',
    '12:00',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200'
);

-- =============================================
-- Room Types (using subqueries to get hotel IDs)
-- =============================================

-- Mumbai Room Types
INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Deluxe Room', 'Elegant room with city views and modern amenities', 8500, 2, 350, 'King', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
FROM hotels WHERE slug = 'grand-palace-mumbai';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Sea View Suite', 'Luxurious suite with stunning Arabian Sea views', 15000, 3, 550, 'King', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
FROM hotels WHERE slug = 'grand-palace-mumbai';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Presidential Suite', 'The ultimate luxury experience with private terrace', 45000, 4, 1200, 'King', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
FROM hotels WHERE slug = 'grand-palace-mumbai';

-- Goa Room Types
INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Garden View Room', 'Peaceful room overlooking tropical gardens', 6500, 2, 320, 'Queen', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'
FROM hotels WHERE slug = 'grand-palace-goa';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Beach Villa', 'Private villa steps from the beach', 18000, 4, 800, 'King', 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800'
FROM hotels WHERE slug = 'grand-palace-goa';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Pool Suite', 'Suite with private plunge pool', 25000, 3, 650, 'King', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800'
FROM hotels WHERE slug = 'grand-palace-goa';

-- Bangalore Room Types
INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Business Room', 'Efficient workspace with ergonomic design', 5500, 2, 280, 'Queen', 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800'
FROM hotels WHERE slug = 'grand-palace-bangalore';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Executive Suite', 'Premium suite with dedicated work area', 9500, 2, 450, 'King', 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800'
FROM hotels WHERE slug = 'grand-palace-bangalore';

-- Jaipur Room Types
INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Heritage Room', 'Traditional Rajasthani decor with modern comfort', 7000, 2, 380, 'King', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'
FROM hotels WHERE slug = 'grand-palace-jaipur';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Royal Suite', 'Palatial suite fit for royalty', 22000, 4, 900, 'King', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800'
FROM hotels WHERE slug = 'grand-palace-jaipur';

-- Delhi Room Types
INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Superior Room', 'Comfortable room with city views', 6000, 2, 300, 'Queen', 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800'
FROM hotels WHERE slug = 'grand-palace-delhi';

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, room_size_sqft, bed_type, image_url)
SELECT id, 'Ambassador Suite', 'Elegant suite for distinguished guests', 18000, 3, 700, 'King', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
FROM hotels WHERE slug = 'grand-palace-delhi';

-- =============================================
-- Create Rooms for each hotel/room type
-- =============================================

-- Mumbai Rooms
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status)
SELECT 
    h.id as hotel_id,
    rt.id as room_type_id,
    CONCAT(floor_num, LPAD(room_num::text, 2, '0')) as room_number,
    floor_num as floor,
    CASE WHEN random() < 0.7 THEN 'AVAILABLE' ELSE 'OCCUPIED' END::room_status as status
FROM hotels h
CROSS JOIN room_types rt
CROSS JOIN generate_series(1, 5) as floor_num
CROSS JOIN generate_series(1, 4) as room_num
WHERE h.slug = 'grand-palace-mumbai' AND rt.hotel_id = h.id;

-- Goa Rooms
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status)
SELECT 
    h.id as hotel_id,
    rt.id as room_type_id,
    CONCAT(floor_num, LPAD(room_num::text, 2, '0')) as room_number,
    floor_num as floor,
    CASE WHEN random() < 0.6 THEN 'AVAILABLE' ELSE 'OCCUPIED' END::room_status as status
FROM hotels h
CROSS JOIN room_types rt
CROSS JOIN generate_series(1, 3) as floor_num
CROSS JOIN generate_series(1, 5) as room_num
WHERE h.slug = 'grand-palace-goa' AND rt.hotel_id = h.id;

-- Bangalore Rooms
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status)
SELECT 
    h.id as hotel_id,
    rt.id as room_type_id,
    CONCAT(floor_num, LPAD(room_num::text, 2, '0')) as room_number,
    floor_num as floor,
    CASE WHEN random() < 0.5 THEN 'AVAILABLE' ELSE 'OCCUPIED' END::room_status as status
FROM hotels h
CROSS JOIN room_types rt
CROSS JOIN generate_series(1, 8) as floor_num
CROSS JOIN generate_series(1, 6) as room_num
WHERE h.slug = 'grand-palace-bangalore' AND rt.hotel_id = h.id;

-- =============================================
-- Hotel Amenities
-- =============================================
INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id FROM hotels h, amenities a 
WHERE h.slug = 'grand-palace-mumbai' AND a.name IN ('Free WiFi', 'Air Conditioning', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Parking', 'Business Center', 'Concierge');

INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id FROM hotels h, amenities a 
WHERE h.slug = 'grand-palace-goa' AND a.name IN ('Free WiFi', 'Air Conditioning', 'Swimming Pool', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Parking', 'Ocean View', 'Kids Play Area');

INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id FROM hotels h, amenities a 
WHERE h.slug = 'grand-palace-bangalore' AND a.name IN ('Free WiFi', 'Air Conditioning', 'Gym', 'Restaurant', 'Room Service', 'Parking', 'Business Center', 'Conference Room', 'Concierge');

-- =============================================
-- Pricing Configuration
-- =============================================

-- Seasonal Pricing for Mumbai
INSERT INTO seasonal_pricing (hotel_id, name, start_date, end_date, multiplier)
SELECT id, 'Peak Season', '2026-10-01', '2026-03-31', 1.3 FROM hotels WHERE slug = 'grand-palace-mumbai';

INSERT INTO seasonal_pricing (hotel_id, name, start_date, end_date, multiplier)
SELECT id, 'Monsoon Season', '2026-06-01', '2026-09-30', 0.85 FROM hotels WHERE slug = 'grand-palace-mumbai';

-- Seasonal Pricing for Goa
INSERT INTO seasonal_pricing (hotel_id, name, start_date, end_date, multiplier)
SELECT id, 'Holiday Season', '2025-12-15', '2026-01-15', 1.5 FROM hotels WHERE slug = 'grand-palace-goa';

INSERT INTO seasonal_pricing (hotel_id, name, start_date, end_date, multiplier)
SELECT id, 'Monsoon Off-Season', '2026-06-01', '2026-09-15', 0.7 FROM hotels WHERE slug = 'grand-palace-goa';

-- Occupancy Pricing
INSERT INTO occupancy_pricing (hotel_id, min_occupancy, max_occupancy, multiplier)
SELECT id, 0, 50, 1.0 FROM hotels WHERE slug IN ('grand-palace-mumbai', 'grand-palace-goa', 'grand-palace-bangalore');

INSERT INTO occupancy_pricing (hotel_id, min_occupancy, max_occupancy, multiplier)
SELECT id, 51, 80, 1.15 FROM hotels WHERE slug IN ('grand-palace-mumbai', 'grand-palace-goa', 'grand-palace-bangalore');

INSERT INTO occupancy_pricing (hotel_id, min_occupancy, max_occupancy, multiplier)
SELECT id, 81, 100, 1.3 FROM hotels WHERE slug IN ('grand-palace-mumbai', 'grand-palace-goa', 'grand-palace-bangalore');

-- =============================================
-- Coupons
-- =============================================

-- Global coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_booking_amount, valid_from, valid_until, max_uses)
VALUES 
    ('WELCOME20', 'Welcome discount for new customers', 'PERCENTAGE', 20, 5000, '2026-01-01', '2026-12-31', 1000),
    ('SUMMER10', 'Summer special offer', 'PERCENTAGE', 10, 3000, '2026-03-01', '2026-06-30', 500),
    ('FLAT1000', 'Flat ₹1000 off on bookings', 'FIXED', 1000, 8000, '2026-01-01', '2026-06-30', 200);

-- Hotel-specific coupons
INSERT INTO coupons (code, description, discount_type, discount_value, hotel_id, min_booking_amount, valid_from, valid_until)
SELECT 'GOABEACH', 'Special beach getaway discount', 'PERCENTAGE', 15, id, 10000, '2026-01-01', '2026-12-31'
FROM hotels WHERE slug = 'grand-palace-goa';

INSERT INTO coupons (code, description, discount_type, discount_value, hotel_id, min_booking_amount, valid_from, valid_until)
SELECT 'ROYALJAIPUR', 'Royal treatment in Jaipur', 'PERCENTAGE', 12, id, 15000, '2026-01-01', '2026-12-31'
FROM hotels WHERE slug = 'grand-palace-jaipur';

-- =============================================
-- Completed seed data insertion
-- =============================================
