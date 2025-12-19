import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import { DigitalSignature } from '../digital-signatures/entities/digital-signature.entity';
import { CurrentLocation } from '../locations/entities/current-location.entity';
import { ReturnState } from '../return-states/entities/return-state.entity';
import { Image } from '../images/entities/image.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Customer } from '../customers/entities/customers.entity';
import { MailerService } from '../mailer/mailer.service';
import { SurveyBrand } from '../../common/enums/survey-brand.enum';
import { SurveyAutomationService } from '../surveys/survey-automation.service';
import { CreateTestDriveFormDto } from './dto/create-test-drive-form.dto';
import { FindTestDriveFormsQueryDto } from './dto/find-test-drive-forms-query.dto';
import { UpdateTestDriveFormDto } from './dto/update-test-drive-form.dto';
import { TestDriveForm, TestDriveFormStatus } from './entities/test-drive-form.entity';

@Injectable()
export class TestDriveFormsService {
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

  private getDefaultSurveyBrand(): SurveyBrand {
    const raw = (process.env.SURVEY_DEFAULT_BRAND || SurveyBrand.MERCEDES_BENZ).trim();
    const allowed = Object.values(SurveyBrand);
    if (!allowed.includes(raw as SurveyBrand)) {
      throw new BadRequestException(
        `Invalid SURVEY_DEFAULT_BRAND "${raw}". Allowed: ${allowed.join(', ')}`,
      );
    }
    return raw as SurveyBrand;
  }

  private async maybeCreateSurveyAndEmail(form: TestDriveForm): Promise<void> {
    if (
      form.status !== TestDriveFormStatus.SUBMITTED &&
      form.status !== TestDriveFormStatus.PENDING
    ) {
      return;
    }

    let created = false;
    let responseId: string | null = null;
    try {
      const result = await this.surveyAutomationService.ensureResponseForTestDriveForm({
        testDriveFormId: form.id,
        brand: form.brand ?? this.getDefaultSurveyBrand(),
      });
      created = result.created;
      responseId = result.response.id;
    } catch (err: any) {
      this.logger.warn(
        `Survey response was not created for form ${form.id}: ${err?.message ?? err}`,
      );
      return;
    }

    if (!created) return;

    const email = form.customer?.email?.trim();
    if (!email) return;

    const baseUrlRaw = (process.env.FRONTEND_BASE_URL || 'http://localhost:4200').trim();
    const baseUrl = baseUrlRaw.replace(/\/+$/, '');
    const surveyUrl = responseId ? `${baseUrl}/survey/${responseId}` : null;

    const subject = 'Encuesta de prueba de manejo';
    const text = [
      `Hola ${form.customer.firstName} ${form.customer.lastName},`,
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
      <p>Hola ${form.customer.firstName} ${form.customer.lastName},</p>
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
    } catch (err: any) {
      this.logger.warn(
        `Survey email was not sent to "${email}" for form ${form.id}: ${err?.message ?? err}`,
      );
    }
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
    const returnState = this.returnStatesRepository.create({
      finalMileage: payload.finalMileage,
      fuelLevelPercentage: payload.fuelLevelPercentage,
    });
    if (payload.images?.length) {
      returnState.images = payload.images.map((url) =>
        this.imagesRepository.create({ url }),
      );
    }
    return returnState;
  }

  async create(dto: CreateTestDriveFormDto): Promise<TestDriveForm> {
    const [customer, vehicle, location] = await Promise.all([
      this.loadCustomer(dto.customerId),
      this.loadVehicle(dto.vehicleId),
      this.loadLocation(dto.locationId),
    ]);

    const signature = dto.signatureData
      ? this.signaturesRepository.create({ signatureData: dto.signatureData })
      : null;

    const returnState = this.buildReturnState(dto.returnState);

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
      status: dto.status ?? TestDriveFormStatus.DRAFT,
    });

    const saved = await this.formsRepository.save(form);
    const full = await this.findOne(saved.id);
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
      .orderBy('form.updatedAt', 'DESC');

    if (query?.status) {
      qb.andWhere('form.status = :status', { status: query.status });
    }
    if (query?.brand) {
      qb.andWhere('form.brand = :brand', { brand: query.brand });
    }
    if (query?.customerId) {
      qb.andWhere('customer.id = :customerId', { customerId: query.customerId });
    }
    if (query?.vehicleId) {
      qb.andWhere('vehicle.id = :vehicleId', { vehicleId: query.vehicleId });
    }
    if (query?.locationId) {
      qb.andWhere('location.id = :locationId', { locationId: query.locationId });
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
      ],
    });
    if (!form) {
      throw new NotFoundException(`Test drive form ${id} not found`);
    }
    return form;
  }

  async update(id: string, dto: UpdateTestDriveFormDto): Promise<TestDriveForm> {
    const form = await this.findOne(id);
    const previousStatus = form.status;

    if (dto.brand !== undefined) {
      form.brand = dto.brand ?? this.getDefaultSurveyBrand();
    }
    if (dto.customerId) {
      form.customer = await this.loadCustomer(dto.customerId);
    }
    if (dto.vehicleId) {
      form.vehicle = await this.loadVehicle(dto.vehicleId);
    }
    if (dto.locationId) {
      form.location = await this.loadLocation(dto.locationId);
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
    }

    if (dto.returnState) {
      if (form.returnState) {
        form.returnState.finalMileage = dto.returnState.finalMileage;
        form.returnState.fuelLevelPercentage =
          dto.returnState.fuelLevelPercentage;

        await this.imagesRepository.delete({
          returnState: { id: form.returnState.id } as ReturnState,
        });
        if (dto.returnState.images?.length) {
          form.returnState.images = dto.returnState.images.map((url) =>
            this.imagesRepository.create({ url }),
          );
        } else {
          form.returnState.images = [];
        }
      } else {
        form.returnState = this.buildReturnState(dto.returnState);
      }
    }

    const saved = await this.formsRepository.save(form);
    const full = await this.findOne(saved.id);

    if (
      previousStatus !== full.status &&
      (full.status === TestDriveFormStatus.SUBMITTED ||
        full.status === TestDriveFormStatus.PENDING)
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
      ],
    });

    if (!form) {
      throw new NotFoundException(`Test drive form ${id} not found`);
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

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

    const signatureDataUrl =
      form.signature?.signatureData?.startsWith('data:image/')
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
          form.customer.firstName,
        )}</div></div>
        <div class="row"><div class="label">Apellidos</div><div class="value">${escapeHtml(
          form.customer.lastName,
        )}</div></div>
        <div class="row"><div class="label">DNI</div><div class="value">${escapeHtml(
          form.customer.dni,
        )}</div></div>
        <div class="row"><div class="label">Teléfono</div><div class="value">${escapeHtml(
          form.customer.phoneNumber,
        )}</div></div>
        <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(
          form.customer.email,
        )}</div></div>
        <div class="row"><div class="label">Sede / Ubicación</div><div class="value">${escapeHtml(
          form.location.locationName,
        )}</div></div>
      </div>
    </div>

    <div class="section">
      <h2>Información del vehículo</h2>
      <div class="rows">
        <div class="row"><div class="label">Marca</div><div class="value">${escapeHtml(
          form.vehicle.make,
        )}</div></div>
        <div class="row"><div class="label">Modelo</div><div class="value">${escapeHtml(
          form.vehicle.model,
        )}</div></div>
        <div class="row"><div class="label">Placa</div><div class="value">${escapeHtml(
          form.vehicle.licensePlate,
        )}</div></div>
        <div class="row"><div class="label">VIN</div><div class="value">${escapeHtml(
          form.vehicle.vinNumber,
        )}</div></div>
        <div class="row"><div class="label">Estado de registro</div><div class="value">${escapeHtml(
          form.vehicle.registerStatus,
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
        <div class="row"><div class="label">Kilometraje final</div><div class="value">${escapeHtml(
          form.returnState?.finalMileage ?? '',
        )}</div></div>
        <div class="row"><div class="label">Nivel de combustible</div><div class="value">${escapeHtml(
          form.returnState?.fuelLevelPercentage ?? '',
        )}${form.returnState?.fuelLevelPercentage != null ? '%' : ''}</div></div>
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

    const email = form.customer.email?.trim();
    if (!email) {
      throw new BadRequestException('Customer email is missing');
    }

    const pdf = await this.generatePdf(id);

    const subject = `Resumen de prueba de manejo - ${form.vehicle.licensePlate}`;
    const text = [
      `Hola ${form.customer.firstName} ${form.customer.lastName},`,
      '',
      'Adjuntamos el resumen de tu prueba de manejo.',
      `Formulario: ${form.id}`,
      `Vehículo: ${form.vehicle.make} ${form.vehicle.model} (${form.vehicle.licensePlate})`,
      `Estado: ${form.status}`,
      '',
      'Gracias.',
    ].join('\n');

    const html = `
      <p>Hola ${form.customer.firstName} ${form.customer.lastName},</p>
      <p>Adjuntamos el resumen de tu prueba de manejo.</p>
      <ul>
        <li><strong>Formulario:</strong> ${form.id}</li>
        <li><strong>Vehículo:</strong> ${form.vehicle.make} ${form.vehicle.model} (${form.vehicle.licensePlate})</li>
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
