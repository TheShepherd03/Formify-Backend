import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignupDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MockAuthService {
  private readonly logger = new Logger(MockAuthService.name);
  private users: Map<string, { id: string; email: string; password: string }> = new Map();

  constructor(private jwtService: JwtService) {
    // Add a test user for development
    this.addTestUser();
  }

  private addTestUser() {
    const testEmail = 'test@example.com';
    const testPassword = bcrypt.hashSync('Test@123', 10);
    const userId = this.generateUUID();
    
    this.users.set(testEmail, {
      id: userId,
      email: testEmail,
      password: testPassword,
    });
    
    this.logger.log(`Added test user with email: ${testEmail}`);
  }

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password } = signupDto;
    this.logger.log(`Attempting to sign up user with email: ${email}`);

    try {
      // Check if user already exists
      if (this.users.has(email)) {
        this.logger.warn(`User with email ${email} already exists`);
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log('Password hashed successfully');

      // Create user in memory
      const userId = this.generateUUID();
      this.users.set(email, {
        id: userId,
        email,
        password: hashedPassword,
      });

      this.logger.log(`User created successfully with ID: ${userId}`);
      this.logger.log(`Current users in memory: ${Array.from(this.users.keys()).join(', ')}`);

      // Generate JWT token
      const token = this.generateToken(userId, email);
      this.logger.log('JWT token generated successfully');

      return {
        token,
        user: {
          email,
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
    this.logger.log(`Available users: ${Array.from(this.users.keys()).join(', ')}`);

    try {
      // Find user by email
      const user = this.users.get(email);

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
      this.logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
