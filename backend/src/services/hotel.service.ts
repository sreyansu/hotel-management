import { supabase } from '../config/database.js';
import {
    Hotel,
    HotelWithDetails,
    Room,
    RoomWithType,
    RoomType,
    RoomTypeWithAmenities,
    RoomStatus,
    PaginatedResponse,
    PaginationParams,
} from '../types/index.js';

/**
 * Hotel and Room Management Service
 */

export class HotelService {
    /**
     * Get all active hotels
     */
    async getHotels(params: PaginationParams & { city?: string } = {}): Promise<PaginatedResponse<Hotel>> {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('hotels')
            .select('*', { count: 'exact' })
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('name');

        if (params.city) {
            query = query.ilike('city', `%${params.city}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            throw new Error(`Failed to fetch hotels: ${error.message}`);
        }

        return {
            data: data as Hotel[],
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Get hotel by ID with full details
     */
    async getHotelById(hotelId: string): Promise<HotelWithDetails | null> {
        const { data: hotel, error } = await supabase
            .from('hotels')
            .select('*')
            .eq('id', hotelId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .single();

        if (error || !hotel) {
            return null;
        }

        // Get hotel images
        const { data: images } = await supabase
            .from('hotel_images')
            .select('*')
            .eq('hotel_id', hotelId)
            .order('display_order');

        // Get hotel amenities
        const { data: amenityLinks } = await supabase
            .from('hotel_amenities')
            .select('amenity:amenities(*)')
            .eq('hotel_id', hotelId);

        const amenities = amenityLinks?.map((link) => link.amenity).filter(Boolean) || [];

        // Get room types
        const { data: roomTypes } = await supabase
            .from('room_types')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('base_price');

        return {
            ...hotel,
            images: images || [],
            amenities: amenities as HotelWithDetails['amenities'],
            room_types: roomTypes || [],
        } as HotelWithDetails;
    }

    /**
     * Get hotel by slug
     */
    async getHotelBySlug(slug: string): Promise<HotelWithDetails | null> {
        const { data } = await supabase
            .from('hotels')
            .select('id')
            .eq('slug', slug)
            .single();

        if (!data) {
            return null;
        }

        return this.getHotelById(data.id);
    }

    /**
     * Create a new hotel
     */
    async createHotel(hotel: Omit<Hotel, 'id' | 'created_at' | 'updated_at'>): Promise<Hotel> {
        // Generate slug if not provided
        if (!hotel.slug) {
            hotel.slug = this.generateSlug(hotel.name, hotel.city);
        }

        const { data, error } = await supabase
            .from('hotels')
            .insert(hotel)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create hotel: ${error.message}`);
        }

        return data as Hotel;
    }

    /**
     * Update a hotel
     */
    async updateHotel(
        hotelId: string,
        updates: Partial<Omit<Hotel, 'id' | 'created_at' | 'updated_at'>>
    ): Promise<Hotel> {
        const { data, error } = await supabase
            .from('hotels')
            .update(updates)
            .eq('id', hotelId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update hotel: ${error.message}`);
        }

        return data as Hotel;
    }

    /**
     * Generate URL-friendly slug
     */
    private generateSlug(name: string, city: string): string {
        const base = `${name}-${city}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        return base;
    }

    // =========================================
    // Room Type Methods
    // =========================================

    /**
     * Get room types for a hotel with availability
     */
    async getRoomTypes(
        hotelId: string,
        checkInDate?: string,
        checkOutDate?: string
    ): Promise<RoomTypeWithAmenities[]> {
        const { data: roomTypes, error } = await supabase
            .from('room_types')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('base_price');

        if (error) {
            throw new Error(`Failed to fetch room types: ${error.message}`);
        }

        // Get amenities for each room type
        const result: RoomTypeWithAmenities[] = [];

        for (const roomType of roomTypes || []) {
            const { data: amenityLinks } = await supabase
                .from('room_type_amenities')
                .select('amenity:amenities(*)')
                .eq('room_type_id', roomType.id);

            const amenities = amenityLinks?.map((link) => link.amenity).filter(Boolean) || [];

            // Calculate availability if dates provided
            let availableCount: number | undefined;
            if (checkInDate && checkOutDate) {
                const { count: totalRooms } = await supabase
                    .from('rooms')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_type_id', roomType.id)
                    .eq('is_active', true);

                const { count: bookedRooms } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_type_id', roomType.id)
                    .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
                    .lt('check_in_date', checkOutDate)
                    .gt('check_out_date', checkInDate);

                availableCount = (totalRooms || 0) - (bookedRooms || 0);
            }

            result.push({
                ...roomType,
                amenities: amenities as RoomTypeWithAmenities['amenities'],
                available_count: availableCount,
            } as RoomTypeWithAmenities);
        }

        return result;
    }

    /**
     * Create a room type
     */
    async createRoomType(
        roomType: Omit<RoomType, 'id' | 'created_at' | 'updated_at'>
    ): Promise<RoomType> {
        const { data, error } = await supabase
            .from('room_types')
            .insert(roomType)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create room type: ${error.message}`);
        }

        return data as RoomType;
    }

    /**
     * Update a room type
     */
    async updateRoomType(
        roomTypeId: string,
        updates: Partial<Omit<RoomType, 'id' | 'hotel_id' | 'created_at' | 'updated_at'>>
    ): Promise<RoomType> {
        const { data, error } = await supabase
            .from('room_types')
            .update(updates)
            .eq('id', roomTypeId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update room type: ${error.message}`);
        }

        return data as RoomType;
    }

    // =========================================
    // Room Methods
    // =========================================

    /**
     * Get all rooms for a hotel
     */
    async getRooms(
        hotelId: string,
        params: { status?: RoomStatus; room_type_id?: string } = {}
    ): Promise<RoomWithType[]> {
        let query = supabase
            .from('rooms')
            .select('*, room_type:room_types(*)')
            .eq('hotel_id', hotelId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('room_number');

        if (params.status) {
            query = query.eq('status', params.status);
        }

        if (params.room_type_id) {
            query = query.eq('room_type_id', params.room_type_id);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch rooms: ${error.message}`);
        }

        return data as RoomWithType[];
    }

    /**
     * Get available rooms for check-in
     */
    async getAvailableRooms(
        hotelId: string,
        roomTypeId: string
    ): Promise<Room[]> {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('room_type_id', roomTypeId)
            .eq('status', 'AVAILABLE')
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('room_number');

        if (error) {
            throw new Error(`Failed to fetch available rooms: ${error.message}`);
        }

        return data as Room[];
    }

    /**
     * Create a room
     */
    async createRoom(
        room: Omit<Room, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Room> {
        const { data, error } = await supabase
            .from('rooms')
            .insert(room)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create room: ${error.message}`);
        }

        return data as Room;
    }

    /**
     * Update room status
     */
    async updateRoomStatus(
        roomId: string,
        status: RoomStatus,
        staffId: string,
        notes?: string
    ): Promise<Room> {
        // Get current room
        const { data: currentRoom } = await supabase
            .from('rooms')
            .select('*, hotel_id')
            .eq('id', roomId)
            .single();

        if (!currentRoom) {
            throw new Error('Room not found');
        }

        // Update room
        const { data, error } = await supabase
            .from('rooms')
            .update({ status })
            .eq('id', roomId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update room status: ${error.message}`);
        }

        // Log housekeeping action
        await supabase
            .from('housekeeping_logs')
            .insert({
                room_id: roomId,
                hotel_id: currentRoom.hotel_id,
                staff_id: staffId,
                action: 'STATUS_CHANGE',
                previous_status: currentRoom.status,
                new_status: status,
                notes,
            });

        return data as Room;
    }

    /**
     * Get housekeeping logs for a room
     */
    async getHousekeepingLogs(roomId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('housekeeping_logs')
            .select('*, staff:users(full_name)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            throw new Error(`Failed to fetch housekeeping logs: ${error.message}`);
        }

        return data || [];
    }
}

export const hotelService = new HotelService();
