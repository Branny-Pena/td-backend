import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { MailerService } from '../mailer/mailer.service';
import { ReturnStateImageRole } from '../images/entities/image.entity';
import { TestDriveForm } from '../test-drive-forms/entities/test-drive-form.entity';
import { SendTestDriveReportDto } from './dto/send-test-drive-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TestDriveForm)
    private readonly formsRepository: Repository<TestDriveForm>,
    private readonly mailerService: MailerService,
  ) {}

  async sendTestDriveReport(dto: SendTestDriveReportDto): Promise<void> {
    const forms = await this.formsRepository.find({
      relations: ['vehicle', 'customer', 'returnState', 'returnState.images'],
      order: { createdAt: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Test Drives');

    sheet.columns = [
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Placa', key: 'placa', width: 16 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'Sucursal de origen', key: 'sucursalOrigen', width: 24 },
      { header: 'Fecha Inicio', key: 'fechaInicio', width: 14 },
      { header: 'Fecha Fin Programado', key: 'fechaFin', width: 18 },
      { header: 'Mantenimiento/Reparacion', key: 'mantenimiento', width: 22 },
      { header: 'Motivo/Justificacion', key: 'motivo', width: 20 },
      { header: 'Asesor', key: 'asesor', width: 18 },
      { header: 'Sucursal del Asesor', key: 'sucursalAsesor', width: 22 },
      { header: 'Cliente', key: 'cliente', width: 24 },
      { header: 'Horario reserva (test drive)', key: 'horaInicio', width: 22 },
      { header: 'Horario reserva RETORNO', key: 'horaFin', width: 22 },
      { header: 'Observaciones', key: 'observaciones', width: 30 },
      { header: 'Intencion de compra', key: 'intencionCompra', width: 18 },
      {
        header: 'Tiempo estimado de compra',
        key: 'tiempoCompra',
        width: 22,
      },
      {
        header: 'Cantidad de Fotos retorno vehiculo',
        key: 'cantidadFotosRetorno',
        width: 28,
      },
      { header: 'Estado test drive', key: 'estado', width: 16 },
    ];

    for (const form of forms) {
      const vehicle = form.vehicle;
      const customer = form.customer;

      const date = this.formatDate(form.createdAt);
      const timeStart = this.formatTime(form.createdAt);
      const timeEnd = this.formatTime(form.updatedAt ?? form.createdAt);
      const customerName = [customer?.firstName, customer?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      const vehiclePhotoCount =
        form.returnState?.images?.filter(
          (img) => img.role === ReturnStateImageRole.VEHICLE,
        ).length ?? 0;

      sheet.addRow({
        modelo: vehicle?.model ?? '',
        placa: vehicle?.licensePlate ?? '',
        color: vehicle?.color ?? '',
        sucursalOrigen: vehicle?.location ?? '',
        fechaInicio: date,
        fechaFin: date,
        mantenimiento: 'Test Drive',
        motivo: 'Prueba Producto',
        asesor: '',
        sucursalAsesor: '',
        cliente: customerName,
        horaInicio: timeStart,
        horaFin: timeEnd,
        observaciones: form.observations ?? '',
        intencionCompra:
          form.purchaseProbability !== null &&
          form.purchaseProbability !== undefined
            ? `${form.purchaseProbability}%`
            : '',
        tiempoCompra: form.estimatedPurchaseDate ?? '',
        cantidadFotosRetorno: vehiclePhotoCount,
        estado: form.status === 'submitted' ? 'Finalizado' : 'En Progreso',
      });
    }

    const buffer = Buffer.from(
      (await workbook.xlsx.writeBuffer()) as ArrayBuffer,
    );

    await this.mailerService.sendMail({
      to: dto.email.trim(),
      subject: 'Reporte de test drives',
      text: 'Adjunto el reporte de test drives en formato Excel.',
      attachments: [
        {
          filename: 'test-drive-report.xlsx',
          content: buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });
  }

  private formatDate(date?: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private formatTime(date?: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}
