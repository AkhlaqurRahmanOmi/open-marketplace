import { Injectable, NotFoundException } from '@nestjs/common';
import { Location } from '@prisma/client';
import { LocationRepository } from '../repositories';
import { CreateLocationDto, UpdateLocationDto } from '../dtos';

@Injectable()
export class LocationManagementProvider {
  constructor(private readonly locationRepository: LocationRepository) {}

  /**
   * Create a new location
   */
  async createLocation(createLocationDto: CreateLocationDto): Promise<Location> {
    return this.locationRepository.create(createLocationDto);
  }

  /**
   * Update an existing location
   */
  async updateLocation(id: number, updateLocationDto: UpdateLocationDto): Promise<Location> {
    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return this.locationRepository.update(id, updateLocationDto);
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: number): Promise<void> {
    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    await this.locationRepository.delete(id);
  }

  /**
   * Get a single location by ID
   */
  async getLocationById(id: number): Promise<Location> {
    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  /**
   * Get all locations
   */
  async getAllLocations(): Promise<Location[]> {
    return this.locationRepository.findAll();
  }

  /**
   * Get location with full inventory details
   */
  async getLocationWithInventory(id: number): Promise<Location> {
    const location = await this.locationRepository.findWithInventory(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }
}
