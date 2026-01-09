import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
    });
}

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
};

// Helper to parse path
function parsePath(path: string) {
    const segments = path.replace(/^\/api\/v1\//, '').replace(/^\.netlify\/functions\/api\//, '').split('/');
    return segments.filter(s => s);
}

// Verify Firebase token
async function verifyToken(authHeader: string | undefined) {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.substring(7);
        const decoded = await admin.auth().verifyIdToken(token);

        // Get user from database
        const { data: user } = await supabase
            .from('users')
            .select('*, user_roles(role, hotel_id)')
            .eq('firebase_uid', decoded.uid)
            .single();

        return user;
    } catch (error) {
        return null;
    }
}

// Main API handler
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    const path = parsePath(event.path);
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};
    const user = await verifyToken(event.headers.authorization);

    try {
        // Health check
        if (path[0] === 'health' || event.path.includes('health')) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
            };
        }

        // Route: GET /hotels
        if (path[0] === 'hotels' && !path[1] && method === 'GET') {
            const { page = '1', limit = '10', city } = query;
            let queryBuilder = supabase
                .from('hotels')
                .select('*, hotel_amenities(amenity:amenities(*))')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (city) queryBuilder = queryBuilder.ilike('city', `%${city}%`);

            const offset = (parseInt(page) - 1) * parseInt(limit);
            queryBuilder = queryBuilder.range(offset, offset + parseInt(limit) - 1);

            const { data, error, count } = await queryBuilder;
            if (error) throw error;

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ data, total: count, page: parseInt(page), limit: parseInt(limit) }),
            };
        }

        // Route: GET /hotels/slug/:slug
        if (path[0] === 'hotels' && path[1] === 'slug' && path[2] && method === 'GET') {
            const { data, error } = await supabase
                .from('hotels')
                .select('*, hotel_amenities(amenity:amenities(*))')
                .eq('slug', path[2])
                .is('deleted_at', null)
                .single();

            if (error || !data) {
                return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Hotel not found' }) };
            }

            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data }) };
        }

        // Route: GET /hotels/:id
        if (path[0] === 'hotels' && path[1] && path[1] !== 'slug' && !path[2] && method === 'GET') {
            const { data, error } = await supabase
                .from('hotels')
                .select('*, hotel_amenities(amenity:amenities(*))')
                .eq('id', path[1])
                .is('deleted_at', null)
                .single();

            if (error || !data) {
                return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Hotel not found' }) };
            }

            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data }) };
        }

        // Route: GET /hotels/:id/room-types
        if (path[0] === 'hotels' && path[1] && path[2] === 'room-types' && method === 'GET') {
            const { data, error } = await supabase
                .from('room_types')
                .select('*')
                .eq('hotel_id', path[1])
                .is('deleted_at', null);

            if (error) throw error;

            // Get available room counts
            const roomTypesWithAvailability = await Promise.all(
                (data || []).map(async (rt) => {
                    const { count } = await supabase
                        .from('rooms')
                        .select('*', { count: 'exact', head: true })
                        .eq('room_type_id', rt.id)
                        .eq('status', 'AVAILABLE');
                    return { ...rt, available_count: count || 0 };
                })
            );

            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data: roomTypesWithAvailability }) };
        }

        // Route: POST /bookings/calculate-price
        if (path[0] === 'bookings' && path[1] === 'calculate-price' && method === 'POST') {
            const { hotel_id, room_type_id, check_in_date, check_out_date, coupon_code } = body;

            // Get room type
            const { data: roomType } = await supabase
                .from('room_types')
                .select('base_price')
                .eq('id', room_type_id)
                .single();

            if (!roomType) {
                return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Room type not found' }) };
            }

            // Calculate nights
            const checkIn = new Date(check_in_date);
            const checkOut = new Date(check_out_date);
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

            const basePrice = parseFloat(roomType.base_price);
            let subtotal = basePrice * nights;
            let discount = 0;
            let couponApplied = null;

            // Apply coupon if provided
            if (coupon_code) {
                const { data: coupon } = await supabase
                    .from('coupons')
                    .select('*')
                    .eq('code', coupon_code.toUpperCase())
                    .eq('is_active', true)
                    .single();

                if (coupon) {
                    if (coupon.discount_type === 'PERCENTAGE') {
                        discount = (subtotal * coupon.discount_value) / 100;
                        if (coupon.max_discount && discount > coupon.max_discount) {
                            discount = coupon.max_discount;
                        }
                    } else if (coupon.discount_type === 'FIXED') {
                        discount = coupon.discount_value;
                    } else if (coupon.discount_type === 'FIXED_FINAL') {
                        discount = subtotal - coupon.discount_value;
                    }
                    discount = Math.max(0, Math.min(discount, subtotal));
                    couponApplied = coupon.code;
                }
            }

            const taxableAmount = subtotal - discount;
            const gstPercentage = parseFloat(process.env.GST_PERCENTAGE || '18');
            const taxAmount = (taxableAmount * gstPercentage) / 100;
            const totalAmount = taxableAmount + taxAmount;

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    data: {
                        base_price_per_night: basePrice,
                        nights,
                        subtotal,
                        discount,
                        coupon_applied: couponApplied,
                        taxable_amount: taxableAmount,
                        tax_percentage: gstPercentage,
                        tax_amount: taxAmount,
                        total_amount: totalAmount,
                    }
                }),
            };
        }

        // Route: POST /bookings
        if (path[0] === 'bookings' && !path[1] && method === 'POST') {
            if (!user) {
                return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
            }

            const { hotel_id, room_type_id, check_in_date, check_out_date, num_guests, guest_name, guest_email, guest_phone, special_requests, coupon_code } = body;

            // Calculate price (simplified)
            const { data: roomType } = await supabase
                .from('room_types')
                .select('base_price')
                .eq('id', room_type_id)
                .single();

            const checkIn = new Date(check_in_date);
            const checkOut = new Date(check_out_date);
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            const basePrice = parseFloat(roomType?.base_price || '0');
            let subtotal = basePrice * nights;
            let discount = 0;

            if (coupon_code) {
                const { data: coupon } = await supabase
                    .from('coupons')
                    .select('*')
                    .eq('code', coupon_code.toUpperCase())
                    .eq('is_active', true)
                    .single();

                if (coupon) {
                    if (coupon.discount_type === 'PERCENTAGE') {
                        discount = (subtotal * coupon.discount_value) / 100;
                    } else if (coupon.discount_type === 'FIXED') {
                        discount = coupon.discount_value;
                    } else if (coupon.discount_type === 'FIXED_FINAL') {
                        discount = subtotal - coupon.discount_value;
                    }
                    discount = Math.max(0, Math.min(discount, subtotal));
                }
            }

            const taxableAmount = subtotal - discount;
            const taxAmount = (taxableAmount * 0.18);
            const totalAmount = taxableAmount + taxAmount;

            // Create booking
            const { data: booking, error } = await supabase
                .from('bookings')
                .insert({
                    hotel_id,
                    user_id: user.id,
                    room_type_id,
                    check_in_date,
                    check_out_date,
                    num_guests,
                    guest_name,
                    guest_email,
                    guest_phone,
                    special_requests,
                    base_amount: subtotal,
                    discount_amount: discount,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    status: 'PENDING',
                })
                .select()
                .single();

            if (error) throw error;

            return { statusCode: 201, headers: corsHeaders, body: JSON.stringify({ data: booking }) };
        }

        // Route: GET /bookings/my-bookings
        if (path[0] === 'bookings' && path[1] === 'my-bookings' && method === 'GET') {
            if (!user) {
                return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
            }

            const { data, error } = await supabase
                .from('bookings')
                .select('*, hotel:hotels(name, slug, city), room_type:room_types(name)')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data }) };
        }

        // Route: GET /bookings/:id
        if (path[0] === 'bookings' && path[1] && !['my-bookings', 'calculate-price', 'reference'].includes(path[1]) && method === 'GET') {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, hotel:hotels(name, slug, city, address), room_type:room_types(name)')
                .eq('id', path[1])
                .single();

            if (error || !data) {
                return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Booking not found' }) };
            }

            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data }) };
        }

        // Route: POST /auth/sync
        if (path[0] === 'auth' && path[1] === 'sync' && method === 'POST') {
            const authHeader = event.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
            }

            const token = authHeader.substring(7);
            const decoded = await admin.auth().verifyIdToken(token);

            // Check if user exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('firebase_uid', decoded.uid)
                .single();

            if (existingUser) {
                return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data: existingUser }) };
            }

            // Create new user
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    firebase_uid: decoded.uid,
                    email: decoded.email,
                    full_name: decoded.name || decoded.email?.split('@')[0] || 'User',
                })
                .select()
                .single();

            if (error) throw error;

            // Add CUSTOMER role
            await supabase.from('user_roles').insert({
                user_id: newUser.id,
                role: 'CUSTOMER',
            });

            return { statusCode: 201, headers: corsHeaders, body: JSON.stringify({ data: newUser }) };
        }

        // Route: GET /auth/me
        if (path[0] === 'auth' && path[1] === 'me' && method === 'GET') {
            if (!user) {
                return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
            }
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ data: user }) };
        }

        // Route: POST /coupons/validate
        if (path[0] === 'coupons' && path[1] === 'validate' && method === 'POST') {
            const { code, hotel_id, booking_amount } = body;

            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !coupon) {
                return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ valid: false, error: 'Invalid coupon code' }) };
            }

            // Calculate discount
            let discount = 0;
            if (coupon.discount_type === 'PERCENTAGE') {
                discount = (booking_amount * coupon.discount_value) / 100;
                if (coupon.max_discount && discount > coupon.max_discount) {
                    discount = coupon.max_discount;
                }
            } else if (coupon.discount_type === 'FIXED') {
                discount = coupon.discount_value;
            } else if (coupon.discount_type === 'FIXED_FINAL') {
                discount = booking_amount - coupon.discount_value;
            }
            discount = Math.max(0, Math.min(discount, booking_amount));

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ valid: true, coupon, discount_amount: discount }),
            };
        }

        // Route not found
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Not found', path: event.path, method }),
        };

    } catch (error: any) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error', message: error.message }),
        };
    }
};

export { handler };
