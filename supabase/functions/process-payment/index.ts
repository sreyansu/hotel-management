// Edge Function: Process Payment
// Handles UPI payment processing and booking confirmation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
    booking_id: string;
    payment_method: 'UPI' | 'CARD' | 'NET_BANKING';
    upi_id?: string;
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
        const supabase = createClient(supabaseUrl, supabaseKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const body: PaymentRequest = await req.json();
        const { booking_id, payment_method, upi_id } = body;

        if (!booking_id || !payment_method) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

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

        // Generate payment reference
        const paymentReference = `PAY${Date.now().toString(36).toUpperCase()}`;

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                booking_id,
                amount: booking.total_amount,
                payment_method,
                payment_reference: paymentReference,
                status: 'COMPLETED', // For demo, mark as completed immediately
                upi_id: upi_id || null,
                paid_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (paymentError) {
            console.error('Payment error:', paymentError);
            return new Response(JSON.stringify({ error: 'Failed to process payment' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Update booking status to CONFIRMED
        await supabase
            .from('bookings')
            .update({ status: 'CONFIRMED' })
            .eq('id', booking_id);

        // Generate UPI payment URL (for demo)
        const merchantUPI = Deno.env.get('UPI_MERCHANT_ID') || 'grandpalace@upi';
        const merchantName = Deno.env.get('UPI_MERCHANT_NAME') || 'Grand Palace Hotels';
        const upiUrl = `upi://pay?pa=${merchantUPI}&pn=${encodeURIComponent(merchantName)}&am=${booking.total_amount}&cu=INR&tn=${encodeURIComponent(`Booking ${booking.booking_reference}`)}`;

        return new Response(JSON.stringify({
            payment,
            upi_url: upiUrl,
            message: 'Payment processed successfully',
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
