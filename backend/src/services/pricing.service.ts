import { supabase } from '../config/database.js';
import { env } from '../config/env.js';
import {
    PriceCalculation,
    PriceBreakdownItem,
    SeasonalPricing,
    DayTypePricing,
    OccupancyPricing,
    PricingConfig,
} from '../types/index.js';

/**
 * Dynamic Pricing Engine
 * 
 * Calculates room prices based on:
 * 1. Base price (from room type)
 * 2. Seasonal multiplier
 * 3. Weekday/Weekend multiplier
 * 4. Occupancy multiplier
 * 5. Coupon discount
 */

export class PricingService {
    /**
     * Get pricing configuration for a hotel
     */
    async getPricingConfig(hotelId: string): Promise<PricingConfig> {
        const [seasonalResult, dayTypeResult, occupancyResult] = await Promise.all([
            supabase
                .from('seasonal_pricing')
                .select('*')
                .eq('hotel_id', hotelId)
                .eq('is_active', true)
                .order('start_date'),
            supabase
                .from('day_type_pricing')
                .select('*')
                .eq('hotel_id', hotelId),
            supabase
                .from('occupancy_pricing')
                .select('*')
                .eq('hotel_id', hotelId)
                .order('min_occupancy_pct'),
        ]);

        return {
            seasonal_pricing: (seasonalResult.data || []) as SeasonalPricing[],
            day_type_pricing: (dayTypeResult.data || []) as DayTypePricing[],
            occupancy_pricing: (occupancyResult.data || []) as OccupancyPricing[],
        };
    }

    /**
     * Calculate the current occupancy percentage for a hotel
     */
    async getOccupancyPercentage(hotelId: string, date: Date): Promise<number> {
        // Get total active rooms
        const { count: totalRooms } = await supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .eq('is_active', true)
            .is('deleted_at', null);

        if (!totalRooms || totalRooms === 0) {
            return 0;
        }

        // Get occupied rooms for the date
        const dateStr = date.toISOString().split('T')[0];
        const { count: bookedRooms } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .in('status', ['CONFIRMED', 'CHECKED_IN'])
            .lte('check_in_date', dateStr)
            .gt('check_out_date', dateStr);

        const occupancy = ((bookedRooms || 0) / totalRooms) * 100;
        return Math.round(occupancy);
    }

    /**
     * Get seasonal multiplier for a specific date
     */
    getSeasonalMultiplier(config: PricingConfig, date: Date): number {
        const dateStr = date.toISOString().split('T')[0];

        for (const season of config.seasonal_pricing) {
            if (dateStr >= season.start_date && dateStr <= season.end_date) {
                return season.multiplier;
            }
        }

        return 1.0; // Default multiplier
    }

    /**
     * Get weekday/weekend multiplier for a specific date
     */
    getDayTypeMultiplier(config: PricingConfig, date: Date): number {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayType = isWeekend ? 'WEEKEND' : 'WEEKDAY';

        const pricing = config.day_type_pricing.find((p) => p.day_type === dayType);
        return pricing?.multiplier || 1.0;
    }

    /**
     * Get occupancy multiplier based on current occupancy
     */
    getOccupancyMultiplier(config: PricingConfig, occupancyPct: number): number {
        for (const tier of config.occupancy_pricing) {
            if (occupancyPct >= tier.min_occupancy_pct && occupancyPct <= tier.max_occupancy_pct) {
                return tier.multiplier;
            }
        }

        return 1.0;
    }

    /**
     * Calculate the full price for a booking
     */
    async calculatePrice(
        hotelId: string,
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
        couponDiscount: number = 0
    ): Promise<PriceCalculation> {
        // Get room type base price
        const { data: roomType, error } = await supabase
            .from('room_types')
            .select('base_price')
            .eq('id', roomTypeId)
            .single();

        if (error || !roomType) {
            throw new Error('Room type not found');
        }

        const basePrice = parseFloat(roomType.base_price);
        const config = await this.getPricingConfig(hotelId);

        // Calculate price for each night
        const breakdown: PriceBreakdownItem[] = [];
        let totalSubtotal = 0;
        let totalSeasonalMultiplier = 0;
        let totalDayTypeMultiplier = 0;
        let totalOccupancyMultiplier = 0;
        let nights = 0;

        const currentDate = new Date(checkInDate);
        while (currentDate < checkOutDate) {
            const occupancyPct = await this.getOccupancyPercentage(hotelId, currentDate);

            const seasonalMultiplier = this.getSeasonalMultiplier(config, currentDate);
            const dayTypeMultiplier = this.getDayTypeMultiplier(config, currentDate);
            const occupancyMultiplier = this.getOccupancyMultiplier(config, occupancyPct);

            const dailyTotal = basePrice * seasonalMultiplier * dayTypeMultiplier * occupancyMultiplier;

            breakdown.push({
                date: currentDate.toISOString().split('T')[0] as string,
                base_price: basePrice,
                seasonal_multiplier: seasonalMultiplier,
                day_type_multiplier: dayTypeMultiplier,
                occupancy_multiplier: occupancyMultiplier,
                daily_total: Math.round(dailyTotal * 100) / 100,
            });

            totalSubtotal += dailyTotal;
            totalSeasonalMultiplier += seasonalMultiplier;
            totalDayTypeMultiplier += dayTypeMultiplier;
            totalOccupancyMultiplier += occupancyMultiplier;
            nights++;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate averages for snapshot
        const avgSeasonalMultiplier = nights > 0 ? totalSeasonalMultiplier / nights : 1;
        const avgDayTypeMultiplier = nights > 0 ? totalDayTypeMultiplier / nights : 1;
        const avgOccupancyMultiplier = nights > 0 ? totalOccupancyMultiplier / nights : 1;

        // Round subtotal
        const subtotal = Math.round(totalSubtotal * 100) / 100;

        // Apply coupon discount
        const discountedSubtotal = Math.max(0, subtotal - couponDiscount);

        // Calculate taxes
        const taxes = Math.round(discountedSubtotal * (env.GST_PERCENTAGE / 100) * 100) / 100;

        // Calculate total
        const totalAmount = Math.round((discountedSubtotal + taxes) * 100) / 100;

        return {
            base_price: basePrice,
            nights,
            seasonal_multiplier: Math.round(avgSeasonalMultiplier * 100) / 100,
            day_type_multiplier: Math.round(avgDayTypeMultiplier * 100) / 100,
            occupancy_multiplier: Math.round(avgOccupancyMultiplier * 100) / 100,
            subtotal,
            coupon_discount: couponDiscount,
            taxes,
            total_amount: totalAmount,
            breakdown,
        };
    }

    /**
     * Update seasonal pricing for a hotel
     */
    async updateSeasonalPricing(
        hotelId: string,
        seasonalPricing: Omit<SeasonalPricing, 'id' | 'hotel_id'>[]
    ): Promise<SeasonalPricing[]> {
        // Delete existing seasonal pricing
        await supabase
            .from('seasonal_pricing')
            .delete()
            .eq('hotel_id', hotelId);

        // Insert new pricing
        const { data, error } = await supabase
            .from('seasonal_pricing')
            .insert(
                seasonalPricing.map((s) => ({
                    ...s,
                    hotel_id: hotelId,
                }))
            )
            .select();

        if (error) {
            throw new Error(`Failed to update seasonal pricing: ${error.message}`);
        }

        return data as SeasonalPricing[];
    }

    /**
     * Update occupancy pricing tiers for a hotel
     */
    async updateOccupancyPricing(
        hotelId: string,
        occupancyPricing: Omit<OccupancyPricing, 'id' | 'hotel_id'>[]
    ): Promise<OccupancyPricing[]> {
        // Delete existing occupancy pricing
        await supabase
            .from('occupancy_pricing')
            .delete()
            .eq('hotel_id', hotelId);

        // Insert new pricing
        const { data, error } = await supabase
            .from('occupancy_pricing')
            .insert(
                occupancyPricing.map((o) => ({
                    ...o,
                    hotel_id: hotelId,
                }))
            )
            .select();

        if (error) {
            throw new Error(`Failed to update occupancy pricing: ${error.message}`);
        }

        return data as OccupancyPricing[];
    }
}

export const pricingService = new PricingService();
