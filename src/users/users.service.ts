import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  constructor(
    private readonly databaseService: DatabaseService
  ) {}

  async getUserProfile(userId: string) {
    this.logger.log(`Getting profile for user with ID: ${userId}`);
    
    const { data, error } = await this.databaseService.client
      .from('users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error(`Error fetching user profile: ${JSON.stringify(error)}`);
      throw new NotFoundException(`User not found: ${error.message}`);
    }
    
    if (!data) {
      this.logger.error(`No user found with ID: ${userId}`);
      throw new NotFoundException('User not found');
    }
    
    this.logger.log(`Successfully retrieved user profile: ${JSON.stringify(data)}`);
    

    return data;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    this.logger.log(`Updating profile for user with ID: ${userId}`);
    this.logger.log(`Update data: ${JSON.stringify(updateProfileDto)}`);
    // First check if email is already taken by another user
    if (updateProfileDto.email) {
      const { data: existingUser } = await this.databaseService.client
        .from('users')
        .select('id')
        .eq('email', updateProfileDto.email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        throw new UnauthorizedException('Email is already in use by another account');
      }
    }

    const { data, error } = await this.databaseService.client
      .from('users')
      .update({
        email: updateProfileDto.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, created_at')
      .single();

    if (error) {
      this.logger.error(`Error updating user profile: ${JSON.stringify(error)}`);
      throw new NotFoundException(`Failed to update user profile: ${error.message}`);
    }
    
    if (!data) {
      this.logger.error(`No user found with ID: ${userId}`);
      throw new NotFoundException('Failed to update user profile');
    }
    
    this.logger.log(`Successfully updated user profile: ${JSON.stringify(data)}`);

    return data;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    this.logger.log(`Changing password for user with ID: ${userId}`);
    // Get the current user to verify the current password
    const { data: user, error: userError } = await this.databaseService.client
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (userError) {
      this.logger.error(`Error fetching user: ${JSON.stringify(userError)}`);
      throw new NotFoundException(`User not found: ${userError.message}`);
    }
    
    if (!user) {
      this.logger.error(`No user found with ID: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid current password for user with ID: ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }
    
    this.logger.log('Current password verified successfully');

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    // Update the password
    const { error } = await this.databaseService.client
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      this.logger.error(`Error updating password: ${JSON.stringify(error)}`);
      throw new NotFoundException(`Failed to update password: ${error.message}`);
    }
    
    this.logger.log('Password updated successfully');

    return { message: 'Password updated successfully' };
  }
}
