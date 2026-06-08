/**
 * Adapter STUB untuk infra yang dibangun di tahap berikutnya (docs/07 urutan build).
 * Sengaja melempar NotImplementedError agar pemakaian tak sengaja gagal cepat
 * dan terlihat jelas — bukan diam-diam mengembalikan data palsu.
 *
 * Implementasi nyata (R2/MinIO, Midtrans, BullMQ, SMTP) menggantikan ini per tahap.
 */
import { NotImplementedError } from '../errors.js';
import type { StoragePort } from '../ports/storage.js';
import type {
  PaymentGatewayPort,
  CreateTxInput,
  PaymentStatus,
} from '../ports/payment-gateway.js';
import type { QueuePort, EnqueueOptions } from '../ports/queue.js';
import type { MailerPort, EmailMessage } from '../ports/mailer.js';

export class StubStorage implements StoragePort {
  put(_key: string, _body: Buffer, _contentType: string): Promise<void> {
    throw new NotImplementedError('StoragePort.put');
  }
  signedUrl(_key: string, _ttlSeconds: number): Promise<string> {
    throw new NotImplementedError('StoragePort.signedUrl');
  }
  delete(_key: string): Promise<void> {
    throw new NotImplementedError('StoragePort.delete');
  }
}

export class StubPaymentGateway implements PaymentGatewayPort {
  createTransaction(
    _input: CreateTxInput,
  ): Promise<{ orderId: string; paymentUrl: string }> {
    throw new NotImplementedError('PaymentGatewayPort.createTransaction');
  }
  verifyNotificationSignature(_payload: unknown): boolean {
    throw new NotImplementedError(
      'PaymentGatewayPort.verifyNotificationSignature',
    );
  }
  getStatus(_orderId: string): Promise<PaymentStatus> {
    throw new NotImplementedError('PaymentGatewayPort.getStatus');
  }
}

export class StubQueue implements QueuePort {
  enqueue(
    _queue: string,
    _payload: unknown,
    _options?: EnqueueOptions,
  ): Promise<{ jobId: string }> {
    throw new NotImplementedError('QueuePort.enqueue');
  }
}

export class StubMailer implements MailerPort {
  send(_message: EmailMessage): Promise<void> {
    throw new NotImplementedError('MailerPort.send');
  }
}
