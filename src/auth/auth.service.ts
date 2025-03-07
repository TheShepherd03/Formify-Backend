import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { SignupDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password } = signupDto;
    this.logger.log(`Attempting to sign up user with email: ${email}`);

    try {
      // Check if user already exists
      const { data: existingUser, error: existingUserError } = await this.databaseService.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUserError && existingUserError.code !== 'PGRST116') {
        this.logger.error(`Error checking existing user: ${JSON.stringify(existingUserError)}`);
        throw new InternalServerErrorException('Error checking user existence');
      }

      if (existingUser) {
        this.logger.warn(`User with email ${email} already exists`);
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log('Password hashed successfully');

      // Create user in Supabase
      this.logger.log('Attempting to create user in Supabase...');
      const { data: newUser, error } = await this.databaseService.client
        .from('users')
        .insert([
          {
            email,
            password: hashedPassword,
          },
        ])
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create user: ${JSON.stringify(error)}`);
        throw new InternalServerErrorException(`Failed to create user: ${error.message}`);
      }

      if (!newUser) {
        this.logger.error('User was created but no data was returned');
        throw new InternalServerErrorException('User was created but no data was returned');
      }

      this.logger.log(`User created successfully with ID: ${newUser.id}`);

      // Generate JWT token
      const token = this.generateToken(newUser.id, newUser.email);
      this.logger.log('JWT token generated successfully');

      return {
        token,
        user: {
          email: newUser.email,
        },
        message: 'User registered successfully',
      };
    } catch (error) {
      this.logger.error(`Signup error: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;
    this.logger.log(`Attempting to log in user with email: ${email}`);

    try {
      // Find user by email
      const { data: user, error } = await this.databaseService.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        this.logger.error(`Error finding user: ${JSON.stringify(error)}`);
        throw new InternalServerErrorException('Error finding user');
      }

      if (!user) {
        this.logger.warn(`User with email ${email} not found`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user with email ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User authenticated successfully: ${user.id}`);

      // Generate JWT token
      const token = this.generateToken(user.id, user.email);
      this.logger.log('JWT token generated successfully');

      return {
        token,
        user: {
          email: user.email,
        },
        message: 'Login successful',
      };
    } catch (error) {
      this.logger.error(`Login error: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
