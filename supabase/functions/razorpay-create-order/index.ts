// Edge Function: Create Razorpay Order
// Creates a Razorpay order for booking payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
    booking_id: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

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

        const body: CreateOrderRequest = await req.json();
        const { booking_id } = body;

        // Get booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking_id)
            .eq('user_id', user.id)
            .single();

        if (bookingError || !booking) {
            return new Response(JSON.stringify({ error: 'Booking not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (booking.status !== 'PENDING') {
            return new Response(JSON.stringify({ error: 'Booking is not pending payment' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Create Razorpay order
        const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${razorpayAuth}`,
            },
            body: JSON.stringify({
                amount: Math.round(booking.total_amount * 100), // Razorpay expects paise
                currency: 'INR',
                receipt: booking.booking_reference,
                notes: {
                    booking_id: booking.id,
                    guest_email: booking.guest_email,
                },
            }),
        });

        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            console.error('Razorpay error:', errorText);
            return new Response(JSON.stringify({ error: 'Failed to create payment order' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const order = await orderResponse.json();

        // Store order ID in payments table
        await supabase.from('payments').insert({
            booking_id: booking.id,
            amount: booking.total_amount,
            payment_method: 'RAZORPAY',
            payment_reference: order.id,
            status: 'PENDING',
        });

        return new Response(JSON.stringify({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: razorpayKeyId,
            booking_reference: booking.booking_reference,
            guest_name: booking.guest_name,
            guest_email: booking.guest_email,
            guest_phone: booking.guest_phone,
        }), {
            status: 200,
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
