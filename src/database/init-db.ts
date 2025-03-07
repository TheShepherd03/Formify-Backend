import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and key must be provided');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  console.log('Initializing database...');

  try {
    // Check if users table exists
    const { error: checkError } = await supabase.from('users').select('count').limit(1);
    
    if (checkError && checkError.code === '42P01') { // Table doesn't exist
      console.log('Users table does not exist, attempting to create it...');
      
      // Since we can't use the SQL method directly with the Supabase client,
      // we'll use the REST API to create a table by making an insert attempt
      // and then provide SQL instructions for manual creation if that fails
      
      try {
        // First, try to create a temporary user to force table creation
        const { error: createError } = await supabase
          .from('users')
          .insert([
            {
              email: 'temp@example.com',
              password: 'temp_password'
            }
          ]);
        
        if (createError && createError.code === '42P01') {
          console.log('Could not automatically create the users table.');
          console.log('\nPlease create the users table manually in your Supabase dashboard:');
          console.log('1. Go to your Supabase project dashboard at: https://app.supabase.com/');
          console.log('2. Navigate to the SQL Editor');
          console.log('3. Run the following SQL:');
          console.log(`
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
          `);
          console.log('\n4. After running the SQL, try running this script again.');
        } else if (createError && createError.code === '23505') {
          // Duplicate key error - table exists and has the temp user
          console.log('Users table already exists with the temporary user.');
        } else if (createError) {
          console.log('Error creating users table:', createError);
        } else {
          console.log('Successfully created users table!');
        }
      } catch (err) {
        console.error('Error during table creation attempt:', err);
      }
    } else if (checkError) {
      console.error('Error checking if users table exists:', checkError);
    } else {
      console.log('Users table already exists.');
    }
    
    // Additional database setup can be added here
    
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

initializeDatabase()
  .then(() => {
    console.log('Database setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
