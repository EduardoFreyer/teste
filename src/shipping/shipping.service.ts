import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ShippingQuoteInput {
  destinationZipCode: string;
  itemsCount: number;
  subtotal: string;
  method: string;
}

@Injectable()
export class ShippingService {
  constructor(private readonly configService: ConfigService) {}

  async getShippingCost(input: ShippingQuoteInput): Promise<string> {
    const apiUrl = this.configService.get<string>('MELHOR_ENVIO_API_URL');
    const token = this.configService.get<string>('MELHOR_ENVIO_TOKEN');

    if (!apiUrl || !token) {
      throw new ServiceUnavailableException('Integração de frete não configurada');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: { postal_code: input.destinationZipCode },
        service: input.method,
        products_count: input.itemsCount,
        subtotal: input.subtotal,
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Falha ao cotar frete no Melhor Envio');
    }

    const payload = (await response.json()) as { price?: string | number };
    if (payload.price === undefined || payload.price === null) {
      throw new ServiceUnavailableException('Resposta inválida da cotação de frete');
    }

    return String(payload.price);
  }
}
