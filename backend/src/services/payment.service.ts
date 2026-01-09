import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database.js';
import { env } from '../config/env.js';
import { PaymentSession, PaymentSessionStatus, Payment } from '../types/index.js';

/**
 * QR Payment Session System
 * 
 * Generates UPI QR codes with session expiry
 */

export class PaymentService {
    /**
     * Create a new payment session with QR code
     */
    async createPaymentSession(
        bookingId: string,
        amount: number
    ): Promise<PaymentSession> {
        // Check if there's already an active session for this booking
        const { data: existingSession } = await supabase
            .from('payment_sessions')
            .select('*')
            .eq('booking_id', bookingId)
            .eq('status', 'PENDING')
            .gt('expires_at', new Date().toISOString())
            .single();

        if (existingSession) {
            return existingSession as PaymentSession;
        }

        // Generate unique session token
        const sessionToken = uuidv4();

        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + env.PAYMENT_SESSION_EXPIRY_MINUTES);

        // Generate UPI payment string
        const upiString = this.generateUpiString(amount, sessionToken);

        // Generate QR code
        const qrCodeData = await this.generateQrCode(upiString);

        // Create payment session
        const { data, error } = await supabase
            .from('payment_sessions')
            .insert({
                booking_id: bookingId,
                session_token: sessionToken,
                amount,
                upi_id: env.UPI_MERCHANT_ID,
                qr_code_data: qrCodeData,
                status: 'PENDING',
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create payment session: ${error.message}`);
        }

        return data as PaymentSession;
    }

    /**
     * Generate UPI payment string
     */
    private generateUpiString(amount: number, transactionRef: string): string {
        const params = new URLSearchParams({
            pa: env.UPI_MERCHANT_ID,
            pn: env.UPI_MERCHANT_NAME,
            am: amount.toFixed(2),
            tr: transactionRef,
            tn: `Hotel Booking Payment - ${transactionRef.substring(0, 8)}`,
            cu: 'INR',
        });

        return `upi://pay?${params.toString()}`;
    }

    /**
     * Generate QR code as base64 data URL
     */
    private async generateQrCode(data: string): Promise<string> {
        return QRCode.toDataURL(data, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });
    }

    /**
     * Get payment session by ID
     */
    async getPaymentSession(sessionId: string): Promise<PaymentSession | null> {
        const { data, error } = await supabase
            .from('payment_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error || !data) {
            return null;
        }

        // Check if session has expired
        const session = data as PaymentSession;
        if (session.status === 'PENDING' && new Date(session.expires_at) < new Date()) {
            // Update status to expired
            await this.updateSessionStatus(sessionId, 'EXPIRED');
            session.status = 'EXPIRED';
        }

        return session;
    }

    /**
     * Get payment session by token
     */
    async getPaymentSessionByToken(token: string): Promise<PaymentSession | null> {
        const { data, error } = await supabase
            .from('payment_sessions')
            .select('*')
            .eq('session_token', token)
            .single();

        if (error || !data) {
            return null;
        }

        return data as PaymentSession;
    }

    /**
     * Update payment session status
     */
    async updateSessionStatus(
        sessionId: string,
        status: PaymentSessionStatus
    ): Promise<void> {
        const { error } = await supabase
            .from('payment_sessions')
            .update({ status })
            .eq('id', sessionId);

        if (error) {
            throw new Error(`Failed to update session status: ${error.message}`);
        }
    }

    /**
     * Verify payment and update booking status
     */
    async verifyPayment(
        sessionId: string,
        transactionId: string,
        paymentMethod: string,
        verifiedBy: string
    ): Promise<Payment> {
        const session = await this.getPaymentSession(sessionId);

        if (!session) {
            throw new Error('Payment session not found');
        }

        if (session.status === 'EXPIRED') {
            throw new Error('Payment session has expired');
        }

        if (session.status === 'PAID') {
            throw new Error('Payment has already been verified');
        }

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                booking_id: session.booking_id,
                payment_session_id: session.id,
                amount: session.amount,
                payment_method: paymentMethod,
                transaction_id: transactionId,
                status: 'COMPLETED',
                verified_by: verifiedBy,
                verified_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (paymentError) {
            throw new Error(`Failed to create payment: ${paymentError.message}`);
        }

        // Update session status
        await this.updateSessionStatus(session.id, 'PAID');

        // Update booking status to confirmed
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'CONFIRMED' })
            .eq('id', session.booking_id);

        if (bookingError) {
            console.error('Failed to update booking status:', bookingError);
        }

        return payment as Payment;
    }

    /**
     * Cancel/expire a payment session
     */
    async cancelSession(sessionId: string): Promise<void> {
        await this.updateSessionStatus(sessionId, 'EXPIRED');
    }

    /**
     * Get all payment sessions for a booking
     */
    async getBookingPaymentSessions(bookingId: string): Promise<PaymentSession[]> {
        const { data, error } = await supabase
            .from('payment_sessions')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch payment sessions: ${error.message}`);
        }

        return data as PaymentSession[];
    }

    /**
     * Get all payments for a booking
     */
    async getBookingPayments(bookingId: string): Promise<Payment[]> {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch payments: ${error.message}`);
        }

        return data as Payment[];
    }

    /**
     * Expire all pending sessions that have passed their expiry time
     * This should be called periodically (e.g., via cron job)
     */
    async expireOldSessions(): Promise<number> {
        const { data, error } = await supabase
            .from('payment_sessions')
            .update({ status: 'EXPIRED' })
            .eq('status', 'PENDING')
            .lt('expires_at', new Date().toISOString())
            .select('id');

        if (error) {
            throw new Error(`Failed to expire sessions: ${error.message}`);
        }

        return data?.length || 0;
    }

    /**
     * Get remaining time for a payment session in seconds
     */
    getRemainingTime(session: PaymentSession): number {
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        const remainingMs = expiresAt.getTime() - now.getTime();
        return Math.max(0, Math.floor(remainingMs / 1000));
    }
}

export const paymentService = new PaymentService();
