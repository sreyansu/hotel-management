// Edge Function: Verify Razorpay Payment
// Verifies payment signature and confirms booking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
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

        const body: VerifyPaymentRequest = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = body;

        // Verify signature
        const expectedSignature = createHmac('sha256', razorpayKeySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Update payment record
        const { error: paymentError } = await supabase
            .from('payments')
            .update({
                status: 'COMPLETED',
                transaction_id: razorpay_payment_id,
                paid_at: new Date().toISOString(),
            })
            .eq('payment_reference', razorpay_order_id);

        if (paymentError) {
            console.error('Payment update error:', paymentError);
        }

        // Update booking status
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'CONFIRMED' })
            .eq('id', booking_id)
            .eq('user_id', user.id);

        if (bookingError) {
            console.error('Booking update error:', bookingError);
            return new Response(JSON.stringify({ error: 'Failed to confirm booking' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Payment verified and booking confirmed',
            booking_id,
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
