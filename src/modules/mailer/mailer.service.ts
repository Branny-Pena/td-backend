import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

type MailerAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

@Injectable()
export class MailerService {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendMail(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: MailerAttachment[];
  }): Promise<{ messageId: string }> {
    if (!params.to?.trim()) {
      throw new BadRequestException('Recipient email is required');
    }

    const transporter = this.getTransporter();
    const from = this.configService.get<string>('SMTP_FROM')?.trim();
    if (!from) {
      throw new ServiceUnavailableException('SMTP_FROM is not configured');
    }

    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return { messageId: info.messageId ?? '' };
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.trim();
    const secureFlag = this.configService.get<string>('SMTP_SECURE')?.trim();

    if (!host) {
      throw new ServiceUnavailableException('SMTP_HOST is not configured');
    }
    if (!Number.isFinite(port) || port <= 0) {
      throw new ServiceUnavailableException('SMTP_PORT is invalid');
    }
    if ((user && !pass) || (!user && pass)) {
      throw new ServiceUnavailableException(
        'SMTP_USER and SMTP_PASS must be set together',
      );
    }

    const secure = secureFlag ? secureFlag === 'true' : port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    return this.transporter;
  }
}
