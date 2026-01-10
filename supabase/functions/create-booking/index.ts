// Edge Function: Create Booking
// Handles booking creation with price calculation and validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
    hotel_id: string;
    room_type_id: string;
    check_in_date: string;
    check_out_date: string;
    num_guests: number;
    guest_name: string;
    guest_email: string;
    guest_phone?: string;
    special_requests?: string;
    coupon_code?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get auth token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Verify user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Parse request body
        const body: BookingRequest = await req.json();
        const {
            hotel_id,
            room_type_id,
            check_in_date,
            check_out_date,
            num_guests,
            guest_name,
            guest_email,
            guest_phone,
            special_requests,
            coupon_code,
        } = body;

        // Validate required fields
        if (!hotel_id || !room_type_id || !check_in_date || !check_out_date || !guest_name || !guest_email) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get room type for pricing
        const { data: roomType, error: roomError } = await supabase
            .from('room_types')
            .select('*')
            .eq('id', room_type_id)
            .single();

        if (roomError || !roomType) {
            return new Response(JSON.stringify({ error: 'Room type not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Calculate number of nights
        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        if (nights < 1) {
            return new Response(JSON.stringify({ error: 'Invalid date range' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Calculate price (base price * nights)
        let totalAmount = Number(roomType.base_price) * nights;

        // Apply coupon if provided
        let appliedCoupon = null;
        if (coupon_code) {
            const { data: coupon } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', coupon_code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (coupon) {
                if (coupon.discount_type === 'PERCENTAGE') {
                    const discount = (totalAmount * Number(coupon.discount_value)) / 100;
                    const maxDiscount = coupon.max_discount ? Number(coupon.max_discount) : discount;
                    totalAmount -= Math.min(discount, maxDiscount);
                } else {
                    totalAmount -= Number(coupon.discount_value);
                }
                appliedCoupon = coupon;
            }
        }

        // Add GST (18%)
        const gstAmount = totalAmount * 0.18;
        totalAmount += gstAmount;

        // Generate booking reference
        const bookingReference = `GP${Date.now().toString(36).toUpperCase()}`;

        // Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                booking_reference: bookingReference,
                hotel_id,
                user_id: user.id,
                room_type_id,
                check_in_date,
                check_out_date,
                num_guests: num_guests || 1,
                status: 'PENDING',
                total_amount: Math.round(totalAmount),
                base_amount: Number(roomType.base_price) * nights,
                tax_amount: Math.round(gstAmount),
                guest_name,
                guest_email,
                guest_phone,
                special_requests,
                coupon_id: appliedCoupon?.id,
            })
            .select(`
                *,
                hotels (*),
                room_types (*)
            `)
            .single();

        if (bookingError) {
            console.error('Booking error:', bookingError);
            return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Update coupon usage if applied
        if (appliedCoupon) {
            await supabase
                .from('coupons')
                .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
                .eq('id', appliedCoupon.id);
        }

        return new Response(JSON.stringify({ booking }), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
