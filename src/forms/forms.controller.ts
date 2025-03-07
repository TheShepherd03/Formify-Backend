import { Controller, Get, Post, Body, Param, Delete, Put, Patch, HttpCode, HttpStatus, BadRequestException, InternalServerErrorException, Logger, UseGuards } from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { FormField } from './entities/form-field.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/user.interface';

@Controller('forms')
export class FormsController {
  private readonly logger = new Logger(FormsController.name);
  
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createForm(
    @Body() createFormDto: CreateFormDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.debug('Raw request body:', createFormDto);
    this.logger.log(`Received form data: ${JSON.stringify(createFormDto)} from user: ${user.sub}`);
    
    // Ensure we have a valid form object with required fields
    if (!createFormDto) {
      this.logger.error('Form data is null');
      throw new BadRequestException('Form data is required');
    }

    this.logger.debug('Form data keys:', Object.keys(createFormDto));
    
    if (Object.keys(createFormDto).length === 0) {
      this.logger.error('Empty form data received');
      throw new BadRequestException('Invalid form data: empty object received');
    }
    
    if (!createFormDto.name) {
      this.logger.error('Form name is missing');
      throw new BadRequestException('Form name is required');
    }
    
    try {
      // Create the form first
      const form = await this.formsService.createForm(createFormDto, user.sub);
      
      this.logger.log(`Form created with ID: ${form.id}`);
      
      // If fields were provided, add them to the form
      if (createFormDto.fields && createFormDto.fields.length > 0) {
        this.logger.log(`Adding ${createFormDto.fields.length} fields to form ${form.id}`);
        
        // Add fields sequentially to ensure proper ordering
        for (const field of createFormDto.fields) {
          await this.formsService.addFieldToForm(form.id, field, user.sub);
        }
      }
      
      // Return the complete form with fields
      return this.formsService.getFormWithFields(form.id, user.sub);
    } catch (error) {
      this.logger.error(`Error creating form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create form: ${error.message}`);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllForms(@CurrentUser() user: JwtPayload) {
    return this.formsService.getAllForms(user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getForm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.formsService.getForm(id, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateForm(
    @Param('id') id: string,
    @Body() updateFormDto: UpdateFormDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`Received updated form data: ${JSON.stringify(updateFormDto)}`);
    try {
      return this.formsService.updateForm(id, updateFormDto, user.sub);
    } catch (error) {
      this.logger.error(`Error updating form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update form: ${error.message}`);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deleteForm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    try {
      return this.formsService.deleteForm(id, user.sub);
    } catch (error) {
      this.logger.error(`Error deleting form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete form: ${error.message}`);
    }
  }

  @Get(':id/with-fields')
  @UseGuards(JwtAuthGuard)
  getFormWithFields(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.formsService.getFormWithFields(id, user.sub);
  }

  @Get(':id/public')
  getPublicForm(@Param('id') id: string) {
    return this.formsService.getPublicForm(id);
  }

  @Get(':id/fields')
  @UseGuards(JwtAuthGuard)
  getFormFields(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    try {
      return this.formsService.getFormFields(id, user.sub);
    } catch (error) {
      this.logger.error(`Error getting form fields: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get form fields: ${error.message}`);
    }
  }

  @Post(':id/fields')
  @UseGuards(JwtAuthGuard)
  async addFieldToForm(
    @Param('id') id: string,
    @Body() createFieldDto: CreateFormFieldDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`Received field data: ${JSON.stringify(createFieldDto)}`);
    try {
      // First verify user has access to this form
      await this.formsService.getForm(id, user.sub);
      return this.formsService.addFieldToForm(id, createFieldDto, user.sub);
    } catch (error) {
      this.logger.error(`Error adding field to form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to add field to form: ${error.message}`);
    }
  }

  @Post(':id/submit')
  async submitForm(
    @Param('id') id: string,
    @Body() submitFormDto: any
  ) {
    this.logger.log('Received form submission request');
    this.logger.debug('Form ID:', id);
    this.logger.debug('Raw body type:', typeof submitFormDto);
    this.logger.debug('Raw body keys:', Object.keys(submitFormDto));
    this.logger.debug('Raw body content:', submitFormDto);
    
    // Create a properly structured DTO
    const formattedDto: SubmitFormDto = {
      responses: Array.isArray(submitFormDto.responses) ? submitFormDto.responses : []
    };
    
    this.logger.debug('Formatted DTO:', formattedDto);
    
    // Check if responses array exists and is not empty
    if (!formattedDto.responses || formattedDto.responses.length === 0) {
      this.logger.error('No valid responses in submission data');
      throw new BadRequestException('No valid responses provided in submission');
    }
    
    // Log each response to help debug
    formattedDto.responses.forEach((response, index) => {
      this.logger.debug(`Response ${index}:`, response);
      if (!response.field_id) {
        this.logger.error(`Missing field_id in response at index ${index}`);
        throw new BadRequestException(`Missing field_id in response at index ${index}`);
      }
      if (response.response === undefined || response.response === null) {
        this.logger.error(`Missing response value in response at index ${index}`);
        throw new BadRequestException(`Missing response value in response at index ${index}`);
      }
    });
    
    try {
      const result = await this.formsService.submitPublicForm(id, formattedDto);
      this.logger.log('Form submission successful:', result);
      return result;
    } catch (error) {
      this.logger.error(`Error submitting form: ${error.message}`);
      this.logger.error('Error details:', error);
      throw new InternalServerErrorException(`Failed to submit form: ${error.message}`);
    }
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  getFormSubmissions(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.formsService.getFormSubmissions(id, user.sub);
  }

  @Get('submissions/:id')
  getSubmission(
    @Param('id') id: string
  ) {
    return this.formsService.getPublicSubmission(id);
  }
  
  @Delete(':id/fields/:fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`Deleting field ${fieldId} from form ${id}`);
    try {
      return this.formsService.deleteField(id, fieldId, user.sub);
    } catch (error) {
      this.logger.error(`Error deleting field: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete field: ${error.message}`);
    }
  }
}
