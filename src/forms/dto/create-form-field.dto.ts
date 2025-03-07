import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  DROPDOWN = 'dropdown',
  FILE = 'file',
  DATE = 'date'
}

export class CreateFormFieldDto {
  @IsString()
  label: string;

  @IsEnum(FieldType)
  field_type: FieldType;

  @IsBoolean()
  @IsOptional()
  required?: boolean = false;

  @IsString()
  @IsOptional()
  options?: string;

  @IsNumber()
  order_number: number;
}
