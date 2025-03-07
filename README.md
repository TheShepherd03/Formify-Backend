# Dynamic Form Builder API

This is the backend API for the Dynamic Form Builder application, built with NestJS and Supabase.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
4. Start the development server:
   ```bash
   npm run start:dev
   ```

## API Endpoints

### Forms

- `GET /api/forms` - Get all forms
- `GET /api/forms/:id` - Get a form by ID
- `POST /api/forms` - Create a new form
- `PUT /api/forms/:id` - Update a form
- `DELETE /api/forms/:id` - Delete a form
- `GET /api/forms/:id/with-fields` - Get a form with its fields

### Form Fields

- `POST /api/forms/:id/fields` - Add a field to a form

### Form Submissions

- `POST /api/forms/:id/submit` - Submit a form
- `GET /api/forms/:id/submissions` - Get all submissions for a form
- `GET /api/forms/submissions/:id` - Get a submission by ID

## Data Models

### Form

```typescript
{
  id: string;
  name: string;
  description: string;
  created_at: Date;
}
```

### Form Field

```typescript
{
  id: string;
  form_id: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string;
  order_number: number;
  created_at: Date;
}
```

### Form Submission

```typescript
{
  id: string;
  form_id: string;
  submitted_at: Date;
}
```

### Submission Response

```typescript
{
  id: string;
  submission_id: string;
  field_id: string;
  response: string;
}
```

## License

This project is licensed under the MIT License.
