import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { Form } from './entities/form.entity';
import { FormField } from './entities/form-field.entity';
import { FormSubmission } from './entities/form-submission.entity';
import { SubmissionResponse } from './entities/submission-response.entity';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async createForm(createFormDto: CreateFormDto, userId: string): Promise<Form> {
    this.logger.log(`Creating form with data: ${JSON.stringify(createFormDto)} for user: ${userId}`);
    
    // Ensure we have valid data
    if (!createFormDto) {
      throw new BadRequestException('Form data is required');
    }
    
    if (!createFormDto.name) {
      throw new BadRequestException('Form name is required');
    }
    
    // Create form without fields first
    const formToCreate = {
      name: createFormDto.name,
      description: createFormDto.description || '',
      user_id: userId
    };
    
    this.logger.log(`Inserting form into database: ${JSON.stringify(formToCreate)}`);
    
    const { data, error } = await this.databaseService.client
      .from('forms')
      .insert(formToCreate)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create form: ${error.message}`);
    }

    this.logger.log(`Form created successfully: ${JSON.stringify(data)}`);
    return data;
  }

  async getForm(id: string, userId: string): Promise<Form> {
    // First check if user is admin
    const { data: user, error: userError } = await this.databaseService.client
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError) {
      this.logger.error(`Failed to fetch user: ${userError.message}`);
      throw new InternalServerErrorException(`Failed to fetch user: ${userError.message}`);
    }

    const { data, error } = await this.databaseService.client
      .from('forms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Failed to fetch form: ${error?.message}`);
      throw new NotFoundException(`Form with ID ${id} not found`);
    }

    // Check if user has access to this form
    if (!user.is_admin && data.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this form');
    }

    return data;
  }

  async getAllForms(userId: string): Promise<Form[]> {
    // First check if user is admin
    const { data: user, error: userError } = await this.databaseService.client
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError) {
      this.logger.error(`Failed to fetch user: ${userError.message}`);
      throw new InternalServerErrorException(`Failed to fetch user: ${userError.message}`);
    }

    // If admin, get all forms, otherwise get only user's forms
    const query = this.databaseService.client
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!user.is_admin) {
      query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch forms: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch forms: ${error.message}`);
    }

    return data || [];
  }

  async deleteForm(id: string, userId: string): Promise<void> {
    // First check if user has access to this form
    const form = await this.getForm(id, userId);

    const { error } = await this.databaseService.client
      .from('forms')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete form: ${error.message}`);
    }
  }

  async updateForm(id: string, updateFormDto: UpdateFormDto, userId: string): Promise<Form> {
    // First check if user has access to this form
    const form = await this.getForm(id, userId);

    const { data, error } = await this.databaseService.client
      .from('forms')
      .update(updateFormDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update form: ${error.message}`);
    }

    return data;
  }

  async addFieldToForm(formId: string, createFieldDto: CreateFormFieldDto, userId: string): Promise<FormField> {
    // First check if user has access to this form
    const form = await this.getForm(formId, userId);

    const fieldData = {
      ...createFieldDto,
      form_id: formId,
    };

    const { data, error } = await this.databaseService.client
      .from('form_fields')
      .insert(fieldData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to add field to form: ${error.message}`);
      throw new InternalServerErrorException(`Failed to add field to form: ${error.message}`);
    }

    return data;
  }

  async getFormWithFields(id: string, userId: string): Promise<{ form: Form; fields: FormField[] }> {
    // First check if user has access to this form
    const form = await this.getForm(id, userId);

    const { data: fields, error } = await this.databaseService.client
      .from('form_fields')
      .select('*')
      .eq('form_id', id)
      .order('order_number', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch form fields: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch form fields: ${error.message}`);
    }

    return {
      form,
      fields: fields || [],
    };
  }
  
  async getPublicForm(id: string): Promise<{ form: Form; fields: FormField[] }> {
    const { data, error } = await this.databaseService.client
      .from('forms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Failed to fetch form: ${error?.message}`);
      throw new NotFoundException(`Form with ID ${id} not found`);
    }

    const { data: fields, error: fieldsError } = await this.databaseService.client
      .from('form_fields')
      .select('*')
      .eq('form_id', id)
      .order('order_number', { ascending: true });

    if (fieldsError) {
      this.logger.error(`Failed to fetch form fields: ${fieldsError.message}`);
      throw new InternalServerErrorException(`Failed to fetch form fields: ${fieldsError.message}`);
    }

    return {
      form: data,
      fields: fields || [],
    };
  }

  async getFormFields(id: string, userId: string): Promise<FormField[]> {
    // First check if user has access to this form
    await this.getForm(id, userId);

    const { data: fields, error } = await this.databaseService.client
      .from('form_fields')
      .select('*')
      .eq('form_id', id)
      .order('order_number', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch form fields: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch form fields: ${error.message}`);
    }

    return fields || [];
  }

  async submitForm(formId: string, submitFormDto: SubmitFormDto, userId: string): Promise<FormSubmission> {
    // First check if user has access to this form
    const form = await this.getForm(formId, userId);

    // Start a transaction
    // Create submission
    const { data: submission, error: submissionError } = await this.databaseService.client
      .from('form_submissions')
      .insert({ form_id: formId })
      .select()
      .single();

    if (submissionError) {
      this.logger.error(`Failed to create form submission: ${submissionError.message}`);
      throw new InternalServerErrorException(`Failed to create form submission: ${submissionError.message}`);
    }

    // Create responses
    const responses = submitFormDto.responses.map(response => ({
      submission_id: submission.id,
      field_id: response.field_id,
      response: response.response,
    }));

    const { error: responsesError } = await this.databaseService.client
      .from('submission_responses')
      .insert(responses);

    if (responsesError) {
      this.logger.error(`Failed to save form responses: ${responsesError.message}`);
      throw new InternalServerErrorException(`Failed to save form responses: ${responsesError.message}`);
    }

    return submission;
  }
  
  async submitPublicForm(formId: string, submitFormDto: SubmitFormDto): Promise<FormSubmission> {
    this.logger.log('Starting public form submission process');
    this.logger.debug('Form ID:', formId);
    this.logger.debug('Raw submission data type:', typeof submitFormDto);
    this.logger.debug('Raw submission data keys:', Object.keys(submitFormDto));
    this.logger.debug('Raw submission data:', submitFormDto);
    
    // Ensure we have a valid submitFormDto with responses array
    if (!submitFormDto) {
      this.logger.error('submitFormDto is null or undefined');
      throw new BadRequestException('Form submission data is required');
    }
    
    if (!submitFormDto.responses) {
      this.logger.error('submitFormDto.responses is null or undefined');
      this.logger.debug('Full request body:', JSON.stringify(submitFormDto));
      throw new BadRequestException('Responses array is required in submission data');
    }
    
    if (!Array.isArray(submitFormDto.responses)) {
      this.logger.error('submitFormDto.responses is not an array');
      this.logger.debug('Actual type:', typeof submitFormDto.responses);
      this.logger.debug('Value:', submitFormDto.responses);
      throw new BadRequestException('Responses must be an array');
    }
    
    if (submitFormDto.responses.length === 0) {
      this.logger.error('submitFormDto.responses is an empty array');
      throw new BadRequestException('At least one response is required');
    }
    
    // Verify the form exists
    this.logger.debug('Verifying form exists...');
    const { data: form, error: formError } = await this.databaseService.client
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();
      
    if (formError || !form) {
      this.logger.error(`Form not found: ${formError?.message}`);
      this.logger.error('Form error details:', formError);
      throw new NotFoundException(`Form with ID ${formId} not found`);
    }
    
    this.logger.debug('Form found:', form);

    // Create submission
    this.logger.debug('Creating form submission...');
    const { data: submission, error: submissionError } = await this.databaseService.client
      .from('form_submissions')
      .insert({ form_id: formId })
      .select()
      .single();

    if (submissionError) {
      this.logger.error(`Failed to create form submission: ${submissionError.message}`);
      this.logger.error('Submission error details:', submissionError);
      throw new InternalServerErrorException(`Failed to create form submission: ${submissionError.message}`);
    }
    
    this.logger.debug('Form submission created:', submission);

    // Create responses
    this.logger.debug('Creating submission responses...');
    const responses = submitFormDto.responses.map((response, index) => {
      this.logger.debug(`Processing response ${index}:`, response);
      
      if (!response.field_id) {
        this.logger.error(`Missing field_id in response at index ${index}`);
        throw new BadRequestException(`Missing field_id in response at index ${index}`);
      }
      
      if (response.response === undefined || response.response === null) {
        this.logger.error(`Missing response value in response at index ${index}`);
        throw new BadRequestException(`Missing response value in response at index ${index}`);
      }
      
      return {
        submission_id: submission.id,
        field_id: response.field_id,
        response: response.response,
      };
    });
    
    this.logger.debug('Prepared responses for insertion:', responses);

    const { error: responsesError } = await this.databaseService.client
      .from('submission_responses')
      .insert(responses);

    if (responsesError) {
      this.logger.error(`Failed to save form responses: ${responsesError.message}`);
      this.logger.error('Response error details:', responsesError);
      throw new InternalServerErrorException(`Failed to save form responses: ${responsesError.message}`);
    }
    
    this.logger.log('Form submission completed successfully');
    return submission;
  }

  async getSubmission(id: string, userId: string): Promise<{
    submission: FormSubmission;
    responses: SubmissionResponse[];
  }> {
    // First check if user has access to this form
    const { data: submission, error: submissionError } = await this.databaseService.client
      .from('form_submissions')
      .select('*, forms(*)')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      this.logger.error(`Failed to fetch submission: ${submissionError?.message}`);
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    const form = await this.getForm(submission.form_id, userId);

    const { data: responses, error: responsesError } = await this.databaseService.client
      .from('submission_responses')
      .select('*, form_fields(*)')
      .eq('submission_id', id);

    if (responsesError) {
      this.logger.error(`Failed to fetch submission responses: ${responsesError.message}`);
      throw new InternalServerErrorException(`Failed to fetch submission responses: ${responsesError.message}`);
    }

    return {
      submission,
      responses: responses || [],
    };
  }
  
  async getPublicSubmission(id: string): Promise<{
    submission: FormSubmission;
    responses: SubmissionResponse[];
  }> {
    const { data: submission, error: submissionError } = await this.databaseService.client
      .from('form_submissions')
      .select('*, forms(*)')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      this.logger.error(`Failed to fetch submission: ${submissionError?.message}`);
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    const { data: responses, error: responsesError } = await this.databaseService.client
      .from('submission_responses')
      .select('*, form_fields(*)')
      .eq('submission_id', id);

    if (responsesError) {
      this.logger.error(`Failed to fetch submission responses: ${responsesError.message}`);
      throw new InternalServerErrorException(`Failed to fetch submission responses: ${responsesError.message}`);
    }

    return {
      submission,
      responses: responses || [],
    };
  }

  async getFormSubmissions(formId: string, userId: string): Promise<FormSubmission[]> {
    // First check if user has access to this form
    const form = await this.getForm(formId, userId);

    const { data, error } = await this.databaseService.client
      .from('form_submissions')
      .select('*')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch form submissions: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch form submissions: ${error.message}`);
    }

    return data || [];
  }

  async deleteField(formId: string, fieldId: string, userId: string): Promise<void> {
    // First check if user has access to this form
    const form = await this.getForm(formId, userId);
    
    // Check if field exists and belongs to the form
    const { data: field, error: fieldError } = await this.databaseService.client
      .from('form_fields')
      .select('*')
      .eq('id', fieldId)
      .eq('form_id', formId)
      .single();
      
    if (fieldError || !field) {
      this.logger.error(`Field not found: ${fieldError?.message}`);
      throw new NotFoundException(`Field with ID ${fieldId} not found in form ${formId}`);
    }
    
    // Delete the field
    const { error } = await this.databaseService.client
      .from('form_fields')
      .delete()
      .eq('id', fieldId);
      
    if (error) {
      this.logger.error(`Failed to delete field: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete field: ${error.message}`);
    }
  }
}
