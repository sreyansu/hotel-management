import { supabase } from '../config/database.js';
import { Coupon, CouponValidationResult, DiscountType } from '../types/index.js';

/**
 * Coupon Engine
 * 
 * Handles coupon validation and discount calculation
 */

export class CouponService {
    /**
     * Validate a coupon code
     */
    async validateCoupon(
        code: string,
        hotelId: string,
        bookingAmount: number,
        userId?: string
    ): Promise<CouponValidationResult> {
        // Get coupon by code
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .is('deleted_at', null)
            .single();

        if (error || !coupon) {
            return {
                valid: false,
                error: 'Invalid coupon code',
            };
        }

        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = new Date(coupon.valid_until);

        // Check validity period
        if (now < validFrom || now > validUntil) {
            return {
                valid: false,
                error: 'Coupon has expired or is not yet valid',
            };
        }

        // Check hotel restriction
        if (coupon.hotel_id && coupon.hotel_id !== hotelId) {
            return {
                valid: false,
                error: 'Coupon is not valid for this hotel',
            };
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return {
                valid: false,
                error: 'Coupon usage limit has been reached',
            };
        }

        // Check minimum booking amount
        if (bookingAmount < coupon.min_booking_amount) {
            return {
                valid: false,
                error: `Minimum booking amount of ₹${coupon.min_booking_amount} required`,
            };
        }

        // Check if user has already used this coupon (if user ID provided)
        if (userId) {
            const { count } = await supabase
                .from('coupon_usage')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id)
                .eq('user_id', userId);

            if (count && count > 0) {
                return {
                    valid: false,
                    error: 'You have already used this coupon',
                };
            }
        }

        // Calculate discount
        const discountAmount = this.calculateDiscount(
            coupon as Coupon,
            bookingAmount
        );

        return {
            valid: true,
            coupon: coupon as Coupon,
            discount_amount: discountAmount,
        };
    }

    /**
     * Calculate discount amount based on coupon type
     */
    calculateDiscount(coupon: Coupon, bookingAmount: number): number {
        let discount = 0;

        if (coupon.discount_type === 'PERCENTAGE') {
            discount = (bookingAmount * coupon.discount_value) / 100;

            // Apply max discount cap if set
            if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        } else if (coupon.discount_type === 'FIXED') {
            discount = coupon.discount_value;
        }

        // Ensure discount doesn't exceed booking amount
        return Math.min(discount, bookingAmount);
    }

    /**
     * Record coupon usage
     */
    async recordUsage(
        couponId: string,
        userId: string,
        bookingId: string,
        discountApplied: number
    ): Promise<void> {
        const { error } = await supabase
            .from('coupon_usage')
            .insert({
                coupon_id: couponId,
                user_id: userId,
                booking_id: bookingId,
                discount_applied: discountApplied,
            });

        if (error) {
            console.error('Failed to record coupon usage:', error);
            throw new Error('Failed to record coupon usage');
        }
    }

    /**
     * Get all coupons for a hotel (including global coupons)
     */
    async getCoupons(hotelId?: string): Promise<Coupon[]> {
        let query = supabase
            .from('coupons')
            .select('*')
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (hotelId) {
            // Get hotel-specific and global coupons
            query = query.or(`hotel_id.eq.${hotelId},hotel_id.is.null`);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch coupons: ${error.message}`);
        }

        return data as Coupon[];
    }

    /**
     * Create a new coupon
     */
    async createCoupon(
        coupon: Omit<Coupon, 'id' | 'used_count' | 'created_at'>,
        createdBy: string
    ): Promise<Coupon> {
        // Ensure code is uppercase
        const couponData = {
            ...coupon,
            code: coupon.code.toUpperCase(),
            used_count: 0,
            created_by: createdBy,
        };

        // Check for duplicate code
        const { data: existing } = await supabase
            .from('coupons')
            .select('id')
            .eq('code', couponData.code)
            .is('deleted_at', null)
            .single();

        if (existing) {
            throw new Error('Coupon code already exists');
        }

        const { data, error } = await supabase
            .from('coupons')
            .insert(couponData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create coupon: ${error.message}`);
        }

        return data as Coupon;
    }

    /**
     * Update a coupon
     */
    async updateCoupon(
        couponId: string,
        updates: Partial<Omit<Coupon, 'id' | 'code' | 'used_count' | 'created_at'>>
    ): Promise<Coupon> {
        const { data, error } = await supabase
            .from('coupons')
            .update(updates)
            .eq('id', couponId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update coupon: ${error.message}`);
        }

        return data as Coupon;
    }

    /**
     * Deactivate a coupon (soft delete)
     */
    async deactivateCoupon(couponId: string): Promise<void> {
        const { error } = await supabase
            .from('coupons')
            .update({
                is_active: false,
                deleted_at: new Date().toISOString(),
            })
            .eq('id', couponId);

        if (error) {
            throw new Error(`Failed to deactivate coupon: ${error.message}`);
        }
    }

    /**
     * Get coupon usage statistics
     */
    async getCouponStats(couponId: string): Promise<{
        total_uses: number;
        total_discount: number;
        unique_users: number;
    }> {
        const { data, error } = await supabase
            .from('coupon_usage')
            .select('user_id, discount_applied')
            .eq('coupon_id', couponId);

        if (error) {
            throw new Error(`Failed to fetch coupon stats: ${error.message}`);
        }

        const usage = data || [];
        const uniqueUsers = new Set(usage.map((u) => u.user_id));
        const totalDiscount = usage.reduce((sum, u) => sum + parseFloat(u.discount_applied), 0);

        return {
            total_uses: usage.length,
            total_discount: Math.round(totalDiscount * 100) / 100,
            unique_users: uniqueUsers.size,
        };
    }
}

export const couponService = new CouponService();
