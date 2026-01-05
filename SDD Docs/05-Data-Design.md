# Data Design

## Entities and Relationships
- Customer 1:N TestDriveForm
- Vehicle 1:N TestDriveForm
- TestDriveForm 1:1 DigitalSignature (optional)
- TestDriveForm 1:1 ReturnState (optional)
- ReturnState 1:N Image (role=vehicle)
- ReturnState 1:1 Image (role=mileage)
- ReturnState 1:1 Image (role=fuel_level)
- Survey 1:N SurveyVersion
- SurveyVersion 1:N SurveyQuestion
- SurveyQuestion 1:N SurveyQuestionOption
- SurveyVersion 1:N SurveyResponse
- SurveyResponse 1:N SurveyAnswer

## Audit Fields
All entities inherit:
- created_at, updated_at (timestamptz)
- created_by, updated_by (nullable UUID)

## Key Enums
- SurveyBrand: MERCEDES-BENZ | ANDES MOTOR | STELLANTIS
- TestDriveFormStatus: draft | submitted
- TestDriveFormStep: CUSTOMER_DATA | VEHICLE_DATA | SIGNATURE_DATA | VALUATION_DATA | VEHICLE_RETURN_DATA | FINAL_CONFIRMATION
- VehicleRegisterStatus: in progress | confirmed
- SurveyStatus: draft | ready
- SurveyResponseStatus: started | submitted
- SurveyQuestionType: number | text | option_single | option_multi
- ReturnStateImageRole: vehicle | mileage | fuel_level

## Data Notes
- Vehicle location is a string on vehicles, not a separate model.
- ReturnState images are persisted explicitly to avoid TypeORM cyclic issues.
- Form submission triggers survey response creation and email.
