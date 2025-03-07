import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('database.supabaseUrl') || 
                        this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('database.supabaseKey') || 
                        this.configService.get<string>('SUPABASE_KEY');
    
    this.logger.log('Initializing Supabase connection');
    
    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Missing Supabase configuration');
      throw new Error('Supabase URL and key must be provided. Check your environment variables.');
    }
    
    // Only log part of the key for security
    this.logger.log(`Connected to Supabase at ${supabaseUrl} with key starting with: ${supabaseKey.substring(0, 5)}...`);
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
  }

  get client() {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    return this.supabase;
  }
}
