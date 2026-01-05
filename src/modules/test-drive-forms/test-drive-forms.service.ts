import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import { DigitalSignature } from '../digital-signatures/entities/digital-signature.entity';
import { CurrentLocation } from '../locations/entities/current-location.entity';
import { ReturnState } from '../return-states/entities/return-state.entity';
import { Image, ReturnStateImageRole } from '../images/entities/image.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Customer } from '../customers/entities/customers.entity';
import { MailerService } from '../mailer/mailer.service';
import { SurveyBrand } from '../../common/enums/survey-brand.enum';
import { SurveyAutomationService } from '../surveys/survey-automation.service';
import { CreateTestDriveFormDto } from './dto/create-test-drive-form.dto';
import { FindTestDriveFormsQueryDto } from './dto/find-test-drive-forms-query.dto';
import { UpdateTestDriveFormDto } from './dto/update-test-drive-form.dto';
import {
  TestDriveForm,
  TestDriveFormStatus,
  TestDriveFormStep,
} from './entities/test-drive-form.entity';
import { ReturnStatePayloadDto } from './dto/return-state-payload.dto';

@Injectable()
export class TestDriveFormsService implements OnModuleInit {
  private readonly logger = new Logger(TestDriveFormsService.name);

  constructor(
    @InjectRepository(TestDriveForm)
    private readonly formsRepository: Repository<TestDriveForm>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(CurrentLocation)
    private readonly locationsRepository: Repository<CurrentLocation>,
    @InjectRepository(DigitalSignature)
    private readonly signaturesRepository: Repository<DigitalSignature>,
    @InjectRepository(ReturnState)
    private readonly returnStatesRepository: Repository<ReturnState>,
    @InjectRepository(Image)
    private readonly imagesRepository: Repository<Image>,
    private readonly mailerService: MailerService,
    private readonly surveyAutomationService: SurveyAutomationService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.formsRepository
      .createQueryBuilder()
      .update(TestDriveForm)
      .set({ status: TestDriveFormStatus.SUBMITTED })
      // Use a text cast so this works even after the enum no longer contains "pending".
      .where('"status"::text = :pending', { pending: 'pending' })
      .execute();

    // Make initial-step creation possible even on existing DBs that still have NOT NULL columns.
    try {
      const cols: Array<{ column_name: string; is_nullable: string }> =
        await this.formsRepository.query(
          `
          SELECT column_name, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'test_drive_forms'
            AND column_name IN ('customerId','vehicleId','locationId','customer_id','vehicle_id','location_id')
        `,
        );

      const dropNotNullIfNeeded = async (column: string) => {
        const row = cols.find((c) => c.column_name === column);
        if (!row || row.is_nullable === 'YES') return;
        await this.formsRepository.query(
          `ALTER TABLE "test_drive_forms" ALTER COLUMN "${column}" DROP NOT NULL`,
        );
      };

      await dropNotNullIfNeeded('customerId');
      await dropNotNullIfNeeded('vehicleId');
      await dropNotNullIfNeeded('locationId');
      await dropNotNullIfNeeded('customer_id');
      await dropNotNullIfNeeded('vehicle_id');
      await dropNotNullIfNeeded('location_id');
    } catch (err) {
      this.logger.warn(`Could not relax test_drive_forms FK nullability: ${String(err)}`);
    }

    await this.formsRepository
      .createQueryBuilder()
      .update(TestDriveForm)
      .set({ currentStep: TestDriveFormStep.CUSTOMER_DATA })
      .where('"current_step" IS NULL')
      .execute();

    await this.formsRepository
      .createQueryBuilder()
      .update(TestDriveForm)
      .set({ currentStep: TestDriveFormStep.FINAL_CONFIRMATION })
      .where('status = :submitted', { submitted: TestDriveFormStatus.SUBMITTED })
      .execute();
  }

  private getDefaultSurveyBrand(): SurveyBrand {
    const raw = (
      process.env.SURVEY_DEFAULT_BRAND || SurveyBrand.MERCEDES_BENZ
    ).trim();
    const allowed = Object.values(SurveyBrand);
    if (!allowed.includes(raw as SurveyBrand)) {
      throw new BadRequestException(
        `Invalid SURVEY_DEFAULT_BRAND "${raw}". Allowed: ${allowed.join(', ')}`,
      );
    }
    return raw as SurveyBrand;
  }

  private async maybeCreateSurveyAndEmail(form: TestDriveForm): Promise<void> {
    if (form.status !== TestDriveFormStatus.SUBMITTED) {
      return;
    }

    const customer = form.customer;
    const describeError = (err: unknown) => {
      if (err instanceof Error) return err.message;
      if (typeof err === 'string') return err;
      return 'Unknown error';
    };

    let responseId: string | null = null;
    try {
      const result =
        await this.surveyAutomationService.ensureResponseForTestDriveForm({
          testDriveFormId: form.id,
          brand: form.brand ?? this.getDefaultSurveyBrand(),
        });
      responseId = result.response.id;
    } catch (err: unknown) {
      this.logger.warn(
        `Survey response was not created for form ${form.id}: ${describeError(err)}`,
      );
      return;
    }

    const email = customer?.email?.trim();
    if (!customer || !email) return;

    const baseUrlRaw = (
      process.env.FRONTEND_BASE_URL || 'http://localhost:4200'
    ).trim();
    const baseUrl = baseUrlRaw.replace(/\/+$/, '');
    const surveyUrl = responseId ? `${baseUrl}/survey/${responseId}` : null;

    const subject = 'Encuesta de prueba de manejo';
    const text = [
      `Hola ${customer.firstName} ${customer.lastName},`,
      '',
      'Gracias por tu prueba de manejo.',
      '',
      `ID de encuesta: ${responseId}`,
      '',
      ...(surveyUrl ? [`Responder encuesta: ${surveyUrl}`] : []),
      '',
      'Gracias.',
    ].join('\n');

    const html = `
      <p>Hola ${customer.firstName} ${customer.lastName},</p>
      <p>Gracias por tu prueba de manejo.</p>
      <p><strong>ID de encuesta:</strong> ${responseId}</p>
      ${surveyUrl ? `<p><a href="${surveyUrl}">Responder encuesta</a></p>` : ''}
      <p>Gracias.</p>
    `;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        text,
        html,
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Survey email was not sent to "${email}" for form ${form.id}: ${describeError(err)}`,
      );
    }
  }

  private async upsertReturnStateSpecialImages(
    returnState: ReturnState,
    payload: ReturnStatePayloadDto,
  ): Promise<void> {
    const [mileageImage, fuelLevelImage] = await Promise.all([
      this.upsertSingleRoleImage(
        returnState,
        ReturnStateImageRole.MILEAGE,
        payload.mileageImageUrl,
      ),
      this.upsertSingleRoleImage(
        returnState,
        ReturnStateImageRole.FUEL_LEVEL,
        payload.fuelLevelImageUrl,
      ),
    ]);

    returnState.mileageImage = mileageImage;
    returnState.fuelLevelImage = fuelLevelImage;
    await this.returnStatesRepository.save(returnState);
  }

  private async replaceReturnStateVehicleImages(
    returnState: ReturnState,
    images?: string[],
  ): Promise<void> {
    if (images === undefined) return;

    await this.imagesRepository.delete({
      returnState: { id: returnState.id } as ReturnState,
      role: ReturnStateImageRole.VEHICLE,
    });

    const vehicleImages = images.map((url) =>
      this.imagesRepository.create({
        url,
        role: ReturnStateImageRole.VEHICLE,
        returnState,
      }),
    );
    if (vehicleImages.length) {
      await this.imagesRepository.save(vehicleImages);
    }
  }

  private async upsertSingleRoleImage(
    returnState: ReturnState,
    role: ReturnStateImageRole,
    url: string,
  ): Promise<Image> {
    const existing = await this.imagesRepository.findOne({
      where: { returnState: { id: returnState.id }, role },
    });
    if (existing) {
      existing.url = url;
      // Ensure the FK is always set when saving; otherwise TypeORM can try to null it.
      existing.returnState = returnState;
      return this.imagesRepository.save(existing);
    }
    const created = this.imagesRepository.create({ url, role, returnState });
    return this.imagesRepository.save(created);
  }

  private async loadCustomer(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  private async loadVehicle(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  private async loadLocation(id: string): Promise<CurrentLocation> {
    const location = await this.locationsRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }

  private buildReturnState(payload?: CreateTestDriveFormDto['returnState']) {
    if (!payload) return null;
    const returnState = this.returnStatesRepository.create();
    return returnState;
  }

  async create(dto: CreateTestDriveFormDto): Promise<TestDriveForm> {
    const [customer, vehicle, location] = await Promise.all([
      dto.customerId ? this.loadCustomer(dto.customerId) : Promise.resolve(null),
      dto.vehicleId ? this.loadVehicle(dto.vehicleId) : Promise.resolve(null),
      dto.locationId ? this.loadLocation(dto.locationId) : Promise.resolve(null),
    ]);

    const signature = dto.signatureData
      ? this.signaturesRepository.create({ signatureData: dto.signatureData })
      : null;

    const returnState = this.buildReturnState(dto.returnState);

    const status = dto.status ?? TestDriveFormStatus.DRAFT;
    const inferredStep =
      status === TestDriveFormStatus.SUBMITTED
        ? TestDriveFormStep.FINAL_CONFIRMATION
        : dto.currentStep ?? TestDriveFormStep.CUSTOMER_DATA;

    const form = this.formsRepository.create({
      brand: dto.brand ?? this.getDefaultSurveyBrand(),
      customer,
      vehicle,
      location,
      signature,
      purchaseProbability: dto.purchaseProbability ?? null,
      estimatedPurchaseDate: dto.estimatedPurchaseDate ?? null,
      observations: dto.observations ?? null,
      returnState,
      status,
      currentStep: inferredStep,
    });

    const saved = await this.formsRepository.save(form);
    let full = await this.findOne(saved.id);
    if (dto.returnState && full.returnState) {
      await this.replaceReturnStateVehicleImages(
        full.returnState,
        dto.returnState.images,
      );
      await this.upsertReturnStateSpecialImages(
        full.returnState,
        dto.returnState,
      );
      full = await this.findOne(saved.id);
    }
    await this.maybeCreateSurveyAndEmail(full);
    return full;
  }

  async findAll(query?: FindTestDriveFormsQueryDto): Promise<TestDriveForm[]> {
    const qb = this.formsRepository
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.customer', 'customer')
      .leftJoinAndSelect('form.vehicle', 'vehicle')
      .leftJoinAndSelect('form.location', 'location')
      .leftJoinAndSelect('form.signature', 'signature')
      .leftJoinAndSelect('form.returnState', 'returnState')
      .leftJoinAndSelect('returnState.images', 'returnStateImages')
      .leftJoinAndSelect('returnState.mileageImage', 'returnStateMileageImage')
      .leftJoinAndSelect(
        'returnState.fuelLevelImage',
        'returnStateFuelLevelImage',
      )
      .orderBy('form.updatedAt', 'DESC');

    if (query?.status) {
      qb.andWhere('form.status = :status', { status: query.status });
    }
    if (query?.brand) {
      qb.andWhere('form.brand = :brand', { brand: query.brand });
    }
    if (query?.customerId) {
      qb.andWhere('customer.id = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query?.vehicleId) {
      qb.andWhere('vehicle.id = :vehicleId', { vehicleId: query.vehicleId });
    }
    if (query?.locationId) {
      qb.andWhere('location.id = :locationId', {
        locationId: query.locationId,
      });
    }
    if (query?.vehicleLicensePlate) {
      qb.andWhere('vehicle.licensePlate ILIKE :plate', {
        plate: `%${query.vehicleLicensePlate.trim()}%`,
      });
    }
    if (query?.vehicleVinNumber) {
      qb.andWhere('vehicle.vinNumber ILIKE :vin', {
        vin: `%${query.vehicleVinNumber.trim()}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<TestDriveForm> {
    const form = await this.formsRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'vehicle',
        'location',
        'signature',
        'returnState',
        'returnState.images',
        'returnState.mileageImage',
        'returnState.fuelLevelImage',
      ],
    });
    if (!form) {
      throw new NotFoundException(`Test drive form ${id} not found`);
    }
    return form;
  }

  async update(
    id: string,
    dto: UpdateTestDriveFormDto,
  ): Promise<TestDriveForm> {
    const form = await this.findOne(id);
    const previousStatus = form.status;
    const shouldTriggerSurveyEmail =
      dto.status === TestDriveFormStatus.SUBMITTED;

    if (dto.brand !== undefined) {
      form.brand = dto.brand ?? this.getDefaultSurveyBrand();
    }
    if (dto.customerId) {
      form.customer = await this.loadCustomer(dto.customerId);
    }
    if (dto.customerId === null) {
      form.customer = null;
    }
    if (dto.vehicleId) {
      form.vehicle = await this.loadVehicle(dto.vehicleId);
    }
    if (dto.vehicleId === null) {
      form.vehicle = null;
    }
    if (dto.locationId) {
      form.location = await this.loadLocation(dto.locationId);
    }
    if (dto.locationId === null) {
      form.location = null;
    }
    if (dto.signatureData !== undefined) {
      if (form.signature) {
        form.signature.signatureData = dto.signatureData ?? '';
      } else if (dto.signatureData) {
        form.signature = this.signaturesRepository.create({
          signatureData: dto.signatureData,
        });
      } else {
        form.signature = null;
      }
    }
    if (dto.purchaseProbability !== undefined) {
      form.purchaseProbability = dto.purchaseProbability;
    }
    if (dto.estimatedPurchaseDate !== undefined) {
      form.estimatedPurchaseDate = dto.estimatedPurchaseDate ?? null;
    }
    if (dto.observations !== undefined) {
      form.observations = dto.observations ?? null;
    }
    if (dto.status !== undefined) {
      form.status = dto.status;
      if (dto.status === TestDriveFormStatus.SUBMITTED) {
        form.currentStep = TestDriveFormStep.FINAL_CONFIRMATION;
      }
    }

    if (dto.currentStep !== undefined) {
      form.currentStep = dto.currentStep;
      if (dto.currentStep === TestDriveFormStep.FINAL_CONFIRMATION) {
        form.status = TestDriveFormStatus.SUBMITTED;
      }
    }

    if (dto.returnState) {
      if (form.returnState) {
        await this.replaceReturnStateVehicleImages(
          form.returnState,
          dto.returnState.images,
        );
      } else {
        form.returnState = this.buildReturnState(dto.returnState);
      }
    }

    const saved = await this.formsRepository.save(form);
    let full = await this.findOne(saved.id);

    if (dto.returnState && full.returnState) {
      await this.replaceReturnStateVehicleImages(
        full.returnState,
        dto.returnState.images,
      );
      await this.upsertReturnStateSpecialImages(
        full.returnState,
        dto.returnState,
      );
      full = await this.findOne(saved.id);
    }

    if (
      shouldTriggerSurveyEmail &&
      (previousStatus !== full.status || dto.status !== undefined)
    ) {
      await this.maybeCreateSurveyAndEmail(full);
    }

    return full;
  }

  async remove(id: string): Promise<void> {
    const result = await this.formsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Test drive form ${id} not found`);
    }
  }

  async generatePdf(id: string): Promise<Buffer> {
    const form = await this.formsRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'vehicle',
        'location',
        'signature',
        'returnState',
        'returnState.images',
        'returnState.mileageImage',
        'returnState.fuelLevelImage',
      ],
    });

    if (!form) {
      throw new NotFoundException(`Test drive form ${id} not found`);
    }

    const customer = form.customer;
    const vehicle = form.vehicle;
    const location = form.location;

    const escapeHtml = (value: unknown) => {
      const str = (() => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean')
          return String(value);
        try {
          return JSON.stringify(value);
        } catch {
          return '';
        }
      })();

      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formatDateTime = (value?: Date | null) => {
      if (!value) return '';
      return new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(value);
    };

    const signatureDataUrl = form.signature?.signatureData?.startsWith(
      'data:image/',
    )
      ? form.signature.signatureData
      : null;

    const vehicleImages = form.returnState?.images?.length
      ? form.returnState.images.map((img) => img.url)
      : [];

    const imagesHtml =
      vehicleImages.length === 0
        ? `<div class="muted">No hay imágenes registradas.</div>`
        : `<div class="grid">
            ${vehicleImages
              .map(
                (url) =>
                  `<div class="img-card"><img src="${escapeHtml(
                    url,
                  )}" alt="Foto del vehículo" /></div>`,
              )
              .join('')}
           </div>`;

    const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Formulario de Test Drive</title>
    <style>
      :root {
        --bg: #ffffff;
        --text: #111827;
        --muted: #6b7280;
        --border: #e5e7eb;
        --chip: #f3f4f6;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        color: var(--text);
        background: var(--bg);
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--border);
      }
      .title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
      }
      .sub {
        margin: 6px 0 0 0;
        color: var(--muted);
        font-size: 12px;
      }
      .chip {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--chip);
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .section {
        margin-top: 16px;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 14px 14px 12px 14px;
      }
      .section h2 {
        margin: 0 0 10px 0;
        font-size: 14px;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .rows { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
      .row { padding: 10px; border: 1px solid var(--border); border-radius: 10px; }
      .label { color: var(--muted); font-size: 11px; margin-bottom: 4px; }
      .value { font-size: 13px; font-weight: 600; white-space: pre-wrap; word-break: break-word; }
      .muted { color: var(--muted); font-size: 12px; }
      .signature-box {
        margin-top: 10px;
        border: 1px dashed var(--border);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 140px;
      }
      .signature-box img { max-width: 100%; max-height: 150px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .img-card {
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fafafa;
      }
      .img-card img { width: 100%; height: 100%; object-fit: cover; }
      .footer {
        margin-top: 18px;
        padding-top: 10px;
        border-top: 1px solid var(--border);
        font-size: 11px;
        color: var(--muted);
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      @media print { body { padding: 18px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <p class="title">Formulario de Test Drive</p>
        <p class="sub">ID: ${escapeHtml(form.id)} · Generado: ${escapeHtml(
          formatDateTime(new Date()),
        )} (Perú)</p>
      </div>
      <div class="chip">${escapeHtml(form.status)}</div>
    </div>

	    <div class="section">
	      <h2>Datos del cliente</h2>
	      <div class="rows">
	        <div class="row"><div class="label">Nombres</div><div class="value">${escapeHtml(
	          customer?.firstName ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Apellidos</div><div class="value">${escapeHtml(
	          customer?.lastName ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">DNI</div><div class="value">${escapeHtml(
	          customer?.dni ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Teléfono</div><div class="value">${escapeHtml(
	          customer?.phoneNumber ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(
	          customer?.email ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Sede / Ubicación</div><div class="value">${escapeHtml(
	          location?.locationName ?? '',
	        )}</div></div>
	      </div>
	    </div>

	    <div class="section">
	      <h2>Información del vehículo</h2>
	      <div class="rows">
	        <div class="row"><div class="label">Marca</div><div class="value">${escapeHtml(
	          vehicle?.make ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Modelo</div><div class="value">${escapeHtml(
	          vehicle?.model ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Placa</div><div class="value">${escapeHtml(
	          vehicle?.licensePlate ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">VIN</div><div class="value">${escapeHtml(
	          vehicle?.vinNumber ?? '',
	        )}</div></div>
	        <div class="row"><div class="label">Estado de registro</div><div class="value">${escapeHtml(
	          vehicle?.registerStatus ?? '',
	        )}</div></div>
	      </div>
	    </div>

    <div class="section">
      <h2>Consentimiento del cliente</h2>
      <div class="muted">
        El cliente declara haber recibido información y autoriza el uso de sus datos para el proceso de test drive.
      </div>
      <div class="signature-box">
        ${
          signatureDataUrl
            ? `<img src="${signatureDataUrl}" alt="Firma digital" />`
            : `<div class="muted">No se registró firma digital.</div>`
        }
      </div>
    </div>

    <div class="section">
      <h2>Evaluación y devolución del vehículo</h2>
      <div class="rows">
        <div class="row"><div class="label">Probabilidad de compra</div><div class="value">${escapeHtml(
          form.purchaseProbability ?? '',
        )}${form.purchaseProbability != null ? '%' : ''}</div></div>
        <div class="row"><div class="label">Compra estimada</div><div class="value">${escapeHtml(
          form.estimatedPurchaseDate ?? '',
        )}</div></div>
        <div class="row" style="grid-column: 1 / -1;"><div class="label">Observaciones</div><div class="value">${escapeHtml(
          form.observations ?? '',
        )}</div></div>
        <div class="row" style="grid-column: 1 / -1;"><div class="label">Foto (kilometraje)</div><div class="value">${
          form.returnState?.mileageImage?.url
            ? `<img src="${escapeHtml(form.returnState.mileageImage.url)}" alt="Kilometraje" style="max-width: 100%; max-height: 240px; border-radius: 8px;" />`
            : ''
        }</div></div>
        <div class="row" style="grid-column: 1 / -1;"><div class="label">Foto (combustible)</div><div class="value">${
          form.returnState?.fuelLevelImage?.url
            ? `<img src="${escapeHtml(form.returnState.fuelLevelImage.url)}" alt="Combustible" style="max-width: 100%; max-height: 240px; border-radius: 8px;" />`
            : ''
        }</div></div>
        <div class="row" style="grid-column: 1 / -1;"><div class="label">Fotos del vehículo</div>${imagesHtml}</div>
      </div>
    </div>

    <div class="footer">
      <div>Creado: ${escapeHtml(formatDateTime(form.createdAt))}</div>
      <div>Actualizado: ${escapeHtml(formatDateTime(form.updatedAt))}</div>
    </div>
  </body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: ['domcontentloaded', 'load'],
        timeout: 15000,
      });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async sendSummaryEmail(id: string): Promise<{ ok: true }> {
    const form = await this.findOne(id);

    const customer = form.customer;
    if (!customer) {
      throw new BadRequestException('Customer is missing');
    }

    const vehicle = form.vehicle;
    if (!vehicle) {
      throw new BadRequestException('Vehicle is missing');
    }

    const email = customer.email?.trim();
    if (!email) {
      throw new BadRequestException('Customer email is missing');
    }

    const pdf = await this.generatePdf(id);

    const subject = `Resumen de prueba de manejo - ${vehicle.licensePlate}`;
    const text = [
      `Hola ${customer.firstName} ${customer.lastName},`,
      '',
      'Adjuntamos el resumen de tu prueba de manejo.',
      `Formulario: ${form.id}`,
      `Vehículo: ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      `Estado: ${form.status}`,
      '',
      'Gracias.',
    ].join('\n');

    const html = `
      <p>Hola ${customer.firstName} ${customer.lastName},</p>
      <p>Adjuntamos el resumen de tu prueba de manejo.</p>
      <ul>
	        <li><strong>Formulario:</strong> ${form.id}</li>
	        <li><strong>Vehículo:</strong> ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})</li>
	        <li><strong>Estado:</strong> ${form.status}</li>
      </ul>
      <p>Gracias.</p>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `prueba-de-manejo-${form.id}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    return { ok: true };
  }
}
